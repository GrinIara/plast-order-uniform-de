import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { groupProducts, normalizeDate, normalizeStock, parseCatalogCsv } from '../src/lib/catalog';

const csv = readFileSync('tests/fixtures/catalog.csv', 'utf8');

describe('parseCatalogCsv', () => {
  const { rows, errors } = parseCatalogCsv(csv);

  it('порожній stock означає «в наявності»', () => {
    expect(rows.find((r) => r.sku === 'UPP-SHIRT-S')?.stock).toBe('in');
  });

  it('розпізнає «під замовлення» та «немає» (регістр і пробіли ігноруються)', () => {
    expect(rows.find((r) => r.sku === 'UPP-SHIRT-M')?.stock).toBe('order');
    expect(rows.find((r) => r.sku === 'UPP-SHIRT-L')?.stock).toBe('none');
  });

  it('некоректні рядки пропускає й повідомляє номер рядка таблиці', () => {
    expect(errors.map((e) => e.row)).toEqual([6, 7, 8]);
    expect(errors[0].message).toContain('stock');
    expect(errors[2].message).toContain('дублікат');
    expect(rows).toHaveLength(4);
  });

  it('залишає коректні рядки при наявності поганих', () => {
    expect(rows.map((r) => r.sku)).toContain('UPP-CAP-ONE');
  });
});

describe('normalizeStock', () => {
  it('невідоме значення дає null', () => {
    expect(normalizeStock('скоро')).toBeNull();
  });
});

describe('groupProducts', () => {
  it('групує розміри за product_id', () => {
    const products = groupProducts(parseCatalogCsv(csv).rows);
    const shirt = products.find((p) => p.productId === 'UPP-SHIRT');
    expect(shirt?.variants.map((v) => v.size)).toEqual(['S', 'M', 'L']);
    expect(products).toHaveLength(2);
  });
});

describe('formatPrice', () => {
  it('показує євро: ціле без копійок, дробове з двома знаками', async () => {
    const { formatPrice } = await import('../src/lib/ui');
    expect(formatPrice(930)).toMatch(/^930\s€$/);
    expect(formatPrice(24.5)).toMatch(/^24,50\s€$/);
    expect(formatPrice(1250)).toMatch(/^1\s?250\s€$/);
  });
});

describe('compareSizes', () => {
  it('ставить «Мала» перед «Велика», числові діапазони за зростанням', async () => {
    const { compareSizes } = await import('../src/lib/catalog');
    expect(['Велика', 'Мала'].sort(compareSizes)).toEqual(['Мала', 'Велика']);
    expect(['38-40', '35-37', 'Дитячі'].sort(compareSizes)).toEqual(['35-37', '38-40', 'Дитячі']);
  });
});

describe('detectUlads', () => {
  it('розпізнає улад за назвою; УПП = пташата; без збігів — універсальний', async () => {
    const { detectUlads } = await import('../src/lib/catalog');
    expect(detectUlads('Сорочка УПП')).toEqual(['Пташата']);
    expect(detectUlads('Футболка пташат')).toEqual(['Пташата']);
    expect(detectUlads('Хустка Новаків')).toEqual(['УПН']);
    expect(detectUlads('Хустка Пластунів Сеньйорів')).toEqual(['УПС']);
    expect(detectUlads('Свисток')).toEqual([]);
  });
});

describe('normalizeDate', () => {
  it('приймає ISO, М/Д/РР і ДД.ММ.РРРР', () => {
    expect(normalizeDate('2026-10-18')).toBe('2026-10-18');
    expect(normalizeDate('10/18/26')).toBe('2026-10-18');
    expect(normalizeDate('1/5/2026')).toBe('2026-01-05');
    expect(normalizeDate('18.10.2026')).toBe('2026-10-18');
    expect(normalizeDate(' 05.01.2026 ')).toBe('2026-01-05');
  });

  it('відхиляє неіснуючі й невідомі формати', () => {
    expect(normalizeDate('18/10/26')).toBeNull();
    expect(normalizeDate('31.02.2026')).toBeNull();
    expect(normalizeDate('2026/10/18')).toBeNull();
    expect(normalizeDate('')).toBeNull();
  });
});

describe('parseCatalogCsv: заголовок', () => {
  it('замість помилки на кожному рядку дає одну про відсутні колонки', () => {
    const broken = csv.replace('updated_at', 'РРРР-ММ-ДД.');
    const { rows, errors } = parseCatalogCsv(broken);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(1);
    expect(errors[0].message).toContain('updated_at');
    expect(errors[0].message).toContain('РРРР-ММ-ДД.');
  });
});
