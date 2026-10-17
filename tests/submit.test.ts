import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/lib/config';
import { buildCopyText, buildOrderText, buildPayload, isValidPhone, validateForm, type ContactForm } from '../src/lib/submit';
import example from '../config.example.json';

const config = configSchema.parse(example);
const items = [
  { sku: 'UPP-SHIRT-M', productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'M', stock: 'in' as const },
  { sku: 'UPP-CAP-ONE', productId: 'UPP-CAP', name: 'Пілотка', size: 'one size', stock: 'order' as const },
];
const form: ContactForm = { firstName: 'Олена', lastName: 'Коваль', phone: '+49 151 2345678', station: 'Düsseldorf', uladh: 'УСП', unit: '', consent: true };

describe('відправлення замовлення', () => {
  it('формує текст замовлення по рядку на позицію', () => {
    expect(buildOrderText(items)).toBe('UPP-SHIRT-M / M — Сорочка УПП\nUPP-CAP-ONE / one size — Пілотка');
  });

  it('кладе поля у відповідні entry.* та пропускає порожній підрозділ', () => {
    const body = buildPayload(config, form, items);
    expect(body.get(config.form.fields.firstName)).toBe('Олена');
    expect(body.get(config.form.fields.uladh)).toBe('УСП');
    expect(body.get(config.form.fields.consent)).toBe('Так');
    expect(body.has(config.form.fields.unit)).toBe(false);
    expect(body.get(config.form.fields.order)).toContain('UPP-CAP-ONE');
  });

  it('текст для копіювання містить позиції та контакти', () => {
    const text = buildCopyText(items, form);
    expect(text).toContain('UPP-SHIRT-M / M');
    expect(text).toContain('Коваль Олена, +49 151 2345678');
  });
});

describe('валідація форми', () => {
  it('телефон', () => {
    expect(isValidPhone('+49 151 2345678')).toBe(true);
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone('12345')).toBe(false);
  });

  it('усі обов\'язкові поля, крім підрозділу', () => {
    const errors = validateForm({ firstName: '', lastName: '', phone: '', station: '', uladh: '', unit: '', consent: false });
    expect(Object.keys(errors).sort()).toEqual(['consent', 'firstName', 'lastName', 'phone', 'station', 'uladh']);
    expect(validateForm(form)).toEqual({});
  });
});
