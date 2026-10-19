import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { useCart } from './cart';
import { ORDER_ID_RE } from './orderId';
import type { CartItem } from './types';

const KEY = 'plast-order-v1';

/** У сховищі лише номер замовлення й SKU вже відправлених позицій: жодних контактів і імені дитини. */
const pendingSchema = z.object({ orderId: z.string().regex(ORDER_ID_RE), sentSkus: z.array(z.string()) });
export type PendingOrder = z.infer<typeof pendingSchema>;

const listeners = new Set<() => void>();
let cache: PendingOrder | null | undefined;

function read(): PendingOrder | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = pendingSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { orderId: parsed.data.orderId, sentSkus: parsed.data.sentSkus };
  } catch {
    /* нечитабельний стан нижче відкидається */
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* localStorage недоступний */
  }
  return null;
}

function write(value: PendingOrder | null): void {
  cache = value;
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    /* localStorage недоступний: стан живе до перезавантаження */
  }
  listeners.forEach((l) => l());
}

export function getPendingOrder(): PendingOrder | null {
  if (cache === undefined) cache = read();
  return cache;
}

export function startPendingOrder(orderId: string): void {
  if (getPendingOrder()) return;
  write({ orderId, sentSkus: [] });
}

export function markLineSent(sku: string): void {
  const current = getPendingOrder();
  if (!current || current.sentSkus.includes(sku)) return;
  write({ ...current, sentSkus: [...current.sentSkus, sku] });
}

export function clearPendingOrder(): void {
  write(null);
}

/** Для тестів: скинути кеш у пам'яті, щоб перечитати localStorage. */
export function resetPendingOrderCache(): void {
  cache = undefined;
}

export function usePendingOrder(): PendingOrder | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getPendingOrder,
    getPendingOrder,
  );
}

export interface PartialStatus {
  orderId: string;
  sent: number;
  total: number;
}

export function countSent(cart: CartItem[], pending: PendingOrder | null): number {
  return pending ? cart.filter((i) => pending.sentSkus.includes(i.sku)).length : 0;
}

/** Часткове замовлення: відправлено щонайменше одну, але не всі позиції кошика. */
export function partialStatus(cart: CartItem[], pending: PendingOrder | null): PartialStatus | null {
  if (!pending) return null;
  const sent = countSent(cart, pending);
  return sent >= 1 && sent < cart.length ? { orderId: pending.orderId, sent, total: cart.length } : null;
}

export function usePartialOrder(): PartialStatus | null {
  return partialStatus(useCart(), usePendingOrder());
}
