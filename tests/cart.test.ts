import { beforeEach, describe, expect, it } from 'vitest';
import { addToCart, cartUnits, clearCart, getCart, removeFromCart, resetCartCache, setQuantity } from '../src/lib/cart';

const item = { sku: 'UPP-SHIRT-M', productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'M', stock: 'in' as const };

describe('кошик', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCartCache();
    clearCart();
  });

  it('зберігається після «перезавантаження» (перечитування localStorage)', () => {
    addToCart(item);
    resetCartCache();
    expect(getCart()).toEqual([{ ...item, quantity: 1 }]);
  });

  it('не додає дублікатів і вміє прибирати позицію', () => {
    addToCart(item);
    addToCart(item);
    expect(getCart()).toHaveLength(1);
    removeFromCart(item.sku);
    expect(getCart()).toHaveLength(0);
  });

  it('переживає пошкоджений localStorage', () => {
    localStorage.setItem('plast-cart-v1', '{not json');
    resetCartCache();
    expect(getCart()).toEqual([]);
  });
});

describe('SPEC-2026-10-19-item-quantity', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCartCache();
    clearCart();
  });

  const L = { ...item, sku: 'UPP-SHIRT-L', size: 'L' };

  it('AC-8: розміри M ×2 і L ×1 — дві окремі позиції', () => {
    addToCart(item);
    addToCart(L);
    setQuantity(item.sku, 2);
    expect(getCart().map((i) => [i.sku, i.quantity])).toEqual([
      ['UPP-SHIRT-M', 2],
      ['UPP-SHIRT-L', 1],
    ]);
    expect(cartUnits(getCart())).toBe(3);
  });

  it('AC-27: кількість 3 зберігається після перезавантаження', () => {
    addToCart(item);
    setQuantity(item.sku, 3);
    resetCartCache();
    expect(getCart()[0].quantity).toBe(3);
  });

  it('AC-28: збережена позиція без кількості завантажується як 1', () => {
    localStorage.setItem('plast-cart-v1', JSON.stringify([item]));
    resetCartCache();
    expect(getCart()[0].quantity).toBe(1);
  });

  it('AC-29: некоректні збережені значення нормалізуються', () => {
    const stored = ['abc', 0, 2.5, 99, null, NaN, -4, '2'].map((q, n) => ({ ...item, sku: `S${n}`, quantity: q }));
    localStorage.setItem('plast-cart-v1', JSON.stringify(stored));
    resetCartCache();
    expect(getCart().map((i) => i.quantity)).toEqual([1, 1, 1, 20, 1, 1, 1, 1]);
  });

  it('межі: setQuantity 21 → 20, 0 → 1, невідомий SKU ігнорується', () => {
    addToCart(item);
    setQuantity(item.sku, 21);
    expect(getCart()[0].quantity).toBe(20);
    setQuantity(item.sku, 0);
    expect(getCart()[0].quantity).toBe(1);
    setQuantity('nope', 5);
    expect(getCart()).toHaveLength(1);
  });
});
