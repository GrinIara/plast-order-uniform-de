import { beforeEach, describe, expect, it } from 'vitest';
import { addToCart, clearCart, getCart, removeFromCart, resetCartCache } from '../src/lib/cart';

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
    expect(getCart()).toEqual([item]);
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
