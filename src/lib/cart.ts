import { useSyncExternalStore } from 'react';
import type { CartItem } from './types';

const KEY = 'plast-cart-v1';
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CartItem[]).filter((i) => i && typeof i.sku === 'string') : [];
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

export function addToCart(item: CartItem): void {
  const items = getCart();
  if (items.some((i) => i.sku === item.sku)) return;
  write([...items, item]);
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
