import { useSyncExternalStore } from 'react';
import { QTY_MAX, QTY_MIN, type CartItem } from './types';

const KEY = 'plast-cart-v1';
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

/** Кількість зі сховища → ціле 1–20; некоректні значення стають 1 (понад 20 → 20). */
export function normalizeQuantity(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < QTY_MIN) return QTY_MIN;
  return raw > QTY_MAX ? QTY_MAX : raw;
}

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as CartItem[])
      .filter((i) => i && typeof i.sku === 'string')
      .map((i) => ({ ...i, quantity: normalizeQuantity((i as { quantity?: unknown }).quantity), nextSize: (i as { nextSize?: unknown }).nextSize === true }));
  } catch {
    return [];
  }
}

function write(items: CartItem[]): void {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* localStorage недоступний: кошик живе до перезавантаження */
  }
  listeners.forEach((l) => l());
}

export function getCart(): CartItem[] {
  if (cache === null) cache = read();
  return cache;
}

export function addToCart(item: Omit<CartItem, 'quantity' | 'nextSize'>): void {
  const items = getCart();
  if (items.some((i) => i.sku === item.sku)) return;
  write([...items, { ...item, quantity: QTY_MIN, nextSize: false }]);
}

export function setQuantity(sku: string, quantity: number): void {
  const items = getCart();
  const current = items.find((i) => i.sku === sku);
  if (!current) return;
  const next = normalizeQuantity(Number.isFinite(quantity) ? Math.round(quantity) : QTY_MIN);
  if (next === current.quantity) return;
  write(items.map((i) => (i.sku === sku ? { ...i, quantity: next } : i)));
}

export function setNextSize(sku: string, nextSize: boolean): void {
  const items = getCart();
  if (!items.some((i) => i.sku === sku)) return;
  write(items.map((i) => (i.sku === sku ? { ...i, nextSize } : i)));
}

export function cartUnits(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function removeFromCart(sku: string): void {
  write(getCart().filter((i) => i.sku !== sku));
}

export function clearCart(): void {
  write([]);
}

/** Для тестів: скинути кеш у пам'яті, щоб перечитати localStorage. */
export function resetCartCache(): void {
  cache = null;
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getCart,
    getCart,
  );
}
