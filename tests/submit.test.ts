import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/lib/config';
import { orderTotals, resolveLines, type PricedLine } from '../src/lib/pricing';
import { buildCopyText, buildLinePayload, isValidPhone, validateForm, type ContactForm } from '../src/lib/submit';
import type { CartItem, Product } from '../src/lib/types';
import example from '../config.example.json';

const config = configSchema.parse(example);
const f = config.form.fields;
const variant = (sku: string, size: string, price: number | null) => ({ sku, size, stock: 'in' as const, price, sourceUrl: '', updatedAt: '2026-10-01' });
const products: Product[] = [
  { productId: 'UPP-SHIRT', nameUk: 'Сорочка УПП', nameDe: '', category: 'c', synonyms: [], ulads: [], variants: [variant('UPP-SHIRT-M', 'M', 930)] },
  { productId: 'UPP-CAP', nameUk: 'Пілотка', nameDe: '', category: 'c', synonyms: [], ulads: [], variants: [variant('UPP-CAP-ONE', 'one size', null)] },
];
const items: CartItem[] = [
  { sku: 'UPP-SHIRT-M', productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'M', stock: 'in', quantity: 2 },
  { sku: 'UPP-CAP-ONE', productId: 'UPP-CAP', name: 'Пілотка', size: 'one size', stock: 'order', quantity: 1 },
];
const lines: PricedLine[] = resolveLines(items, products);
const totals = orderTotals(lines);
const form: ContactForm = {
  firstName: 'Олена',
  lastName: 'Коваль',
  phone: '+49 151 2345678',
  station: 'Düsseldorf',
  uladh: 'УСП',
  unit: '',
  consent: true,
  childFirstName: '  Олеся ',
  childLastName: 'Коваль',
};
const ID = '20261019-7KQX';
const flat = (s: string) => s.replace(/[^\S\n]/g, ' ');

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-31, AC-32, AC-62: рядок несе контакти, номер, SKU, назву, розмір, кількість і імена дитини', () => {
    const body = buildLinePayload(config, form, lines[0], ID);
    expect(body.get(f.firstName)).toBe('Олена');
    expect(body.get(f.uladh)).toBe('УСП');
    expect(body.get(f.consent)).toBe('Так');
    expect(body.has(f.unit)).toBe(false);
    expect(body.get(f.orderId)).toBe(ID);
    expect(body.get(f.sku)).toBe('UPP-SHIRT-M');
    expect(body.get(f.size)).toBe('M');
    expect(body.get(f.quantity)).toBe('2');
    expect(body.get(f.childFirstName)).toBe('Олеся');
    expect(body.get(f.childLastName)).toBe('Коваль');
  });

  it('AC-33, AC-36: itemName і quantity — назва з каталогу (інакше збережена) та ціле число рядком', () => {
    const stored = resolveLines([items[0]], []);
    expect(buildLinePayload(config, form, stored[0], ID).get(f.itemName)).toBe('Сорочка УПП');
    expect(buildLinePayload(config, form, { ...lines[0], name: 'Нова назва' }, ID).get(f.itemName)).toBe('Нова назва');
    expect(buildLinePayload(config, form, lines[1], ID).get(f.quantity)).toBe('1');
  });

  it('AC-34: без SKU в каталозі рядок все одно має збережену назву', () => {
    const [line] = resolveLines([items[1]], []);
    expect(buildLinePayload(config, form, line, ID).get(f.itemName)).toBe('Пілотка');
  });

  it('AC-35, AC-37: «Сума» — сума цієї позиції, лише коли є ціна й поле налаштоване; десяткова кома', () => {
    expect(buildLinePayload(config, form, lines[0], ID).get(f.total!)).toBe('1860');
    expect(buildLinePayload(config, form, { ...lines[0], lineTotal: 1884.5 }, ID).get(f.total!)).toBe('1884,5');
    expect(buildLinePayload(config, form, lines[1], ID).has(f.total!)).toBe(false);
    const noTotal = configSchema.parse({ ...example, form: { ...example.form, fields: { ...example.form.fields, total: undefined } } });
    expect(buildLinePayload(noTotal, form, lines[0], ID).has('entry.1008')).toBe(false);
  });

  it('AC-38: застаріле поле «order» ніколи не надсилається', () => {
    const body = buildLinePayload(config, form, lines[0], ID);
    expect(body.has(f.order!)).toBe(false);
  });

  it('AC-65: коми в іменах дитини надсилаються без змін і проходять валідацію', () => {
    const commas = { ...form, childFirstName: 'Олена, Іван', childLastName: 'Коваль, Коваль' };
    const body = buildLinePayload(config, commas, lines[1], ID);
    expect(body.get(f.childFirstName)).toBe('Олена, Іван');
    expect(body.get(f.childLastName)).toBe('Коваль, Коваль');
    expect(validateForm(commas)).toEqual({});
  });

  it('AC-52: текст для копіювання збігається із задокументованим прикладом', () => {
    const text = buildCopyText(
      lines,
      totals,
      { ...form, firstName: "Ім'я", lastName: 'Прізвище', phone: '+49 151 0000000', uladh: 'УПН', unit: 'курінь', childFirstName: 'Олена, Іван', childLastName: 'Коваль, Коваль' },
      '20261019-7KQX',
    );
    expect(flat(text)).toBe(
      [
        'Замовлення: 20261019-7KQX',
        'UPP-SHIRT-M / M — Сорочка УПП × 2 · 930 € = 1 860 €',
        'UPP-CAP-ONE / one size — Пілотка × 1 · ціна невідома',
        'Разом орієнтовно: 1 860 € (1 позиція без ціни)',
        "Ім'я дитини: Олена, Іван",
        'Прізвище дитини: Коваль, Коваль',
        '',
        "Прізвище Ім'я, +49 151 0000000",
        'Düsseldorf, УПН, курінь',
      ].join('\n'),
    );
  });

  it('AC-52: без номера — «Замовлення:», без цін — без рядка суми, порожні імена дитини пропущено', () => {
    const unpriced = resolveLines([items[1]], []);
    const text = buildCopyText(unpriced, orderTotals(unpriced), { ...form, childFirstName: ' ', childLastName: '' }, null);
    expect(text.split('\n')[0]).toBe('Замовлення:');
    expect(text).not.toContain('Разом');
    expect(text).not.toContain('дитини');
  });

  it('AC-59, AC-60: порожні або пробільні імена дитини дають помилки', () => {
    const errors = validateForm({ ...form, childFirstName: '   ', childLastName: '' });
    expect(Object.keys(errors).sort()).toEqual(['childFirstName', 'childLastName']);
    expect(validateForm(form)).toEqual({});
  });
});

describe('валідація форми', () => {
  it('телефон', () => {
    expect(isValidPhone('+49 151 2345678')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('12345')).toBe(false);
  });

  it("усі обов'язкові поля, крім підрозділу", () => {
    const empty = { firstName: '', lastName: '', phone: '', station: '', uladh: '', unit: '', consent: false, childFirstName: '', childLastName: '' };
    expect(Object.keys(validateForm(empty)).sort()).toEqual(['childFirstName', 'childLastName', 'consent', 'firstName', 'lastName', 'phone', 'station', 'uladh']);
  });
});
