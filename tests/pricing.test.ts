import { describe, expect, it } from 'vitest';
import { formatSumField, orderTotals, resolveLines } from '../src/lib/pricing';
import type { CartItem, Product } from '../src/lib/types';

const variant = (sku: string, price: number | null) => ({ sku, size: 'M', stock: 'in' as const, price, sourceUrl: '', updatedAt: '2026-01-01' });
const products = (price: number): Product[] => [
  { productId: 'P1', nameUk: 'Каталожна назва', nameDe: '', category: 'c', synonyms: [], ulads: [], variants: [variant('A', price), variant('B', 24.5)] },
];
const item = (sku: string, quantity: number): CartItem => ({ sku, productId: 'P1', name: 'Збережена назва', size: 'M', stock: 'in', quantity, nextSize: false });

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-19: 930 × 2 + 24,50 × 1 = 1884,5', () => {
    const totals = orderTotals(resolveLines([item('A', 2), item('B', 1)], products(930)));
    expect(totals).toEqual({ lines: 2, units: 3, total: 1884.5, unpriced: 0 });
  });

  it('AC-23: зміна ціни в каталозі змінює суму рядка; зниклий SKU — без ціни', () => {
    expect(resolveLines([item('A', 2)], products(100))[0].lineTotal).toBe(200);
    expect(resolveLines([item('A', 2)], products(150))[0].lineTotal).toBe(300);
    const gone = resolveLines([item('ZZ', 2)], products(100))[0];
    expect(gone.price).toBeNull();
    expect(gone.lineTotal).toBeNull();
    expect(orderTotals([gone])).toMatchObject({ total: null, unpriced: 1 });
  });

  it('AC-37: поле «Сума» з десятковою комою без роздільників', () => {
    expect(formatSumField(1884.5)).toBe('1884,5');
    expect(formatSumField(1860)).toBe('1860');
    expect(formatSumField(0.1 + 0.2)).toBe('0,3');
  });

  it('AC-34: назва береться з каталогу, інакше зі збереженої', () => {
    expect(resolveLines([item('A', 1)], products(1))[0].name).toBe('Каталожна назва');
    expect(resolveLines([item('A', 1)], [])[0].name).toBe('Збережена назва');
  });
});
