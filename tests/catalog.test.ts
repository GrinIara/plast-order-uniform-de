import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { groupProducts, normalizeStock, parseCatalogCsv } from '../src/lib/catalog';

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
  it('показує гривні: ціле без копійок, дробове з двома знаками', async () => {
    const { formatPrice } = await import('../src/lib/ui');
    expect(formatPrice(930)).toMatch(/^930\s₴$/);
    expect(formatPrice(24.5)).toMatch(/^24,50\s₴$/);
    expect(formatPrice(1250)).toMatch(/^1\s?250\s₴$/);
  });
});

describe('compareSizes', () => {
  it('ставить «Мала» перед «Велика», числові діапазони за зростанням', async () => {
    const { compareSizes } = await import('../src/lib/catalog');
    expect(['Велика', 'Мала'].sort(compareSizes)).toEqual(['Мала', 'Велика']);
    expect(['38-40', '35-37', 'Дитячі'].sort(compareSizes)).toEqual(['35-37', '38-40', 'Дитячі']);
  });
});
