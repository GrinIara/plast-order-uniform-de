import { useSyncExternalStore } from 'react';
import { berlinDate } from './orderWindow';

let today: string | null = null;
const listeners = new Set<() => void>();

/** Поточна дата за Берліном; обчислюється при першому зверненні. */
export function getOrderWindowToday(): string {
  if (today === null) today = berlinDate(new Date());
  return today;
}

/** Перечитує годинник (завантаження сторінки, клік «Відправити»); підписників сповіщає лише при зміні дати. */
export function recheckOrderWindow(): void {
  const next = berlinDate(new Date());
  if (next === today) return;
  today = next;
  listeners.forEach((l) => l());
}

export function useOrderWindowToday(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getOrderWindowToday,
    getOrderWindowToday,
  );
}

/** Для тестів: скидає збережену дату. */
export function resetOrderWindowClock(): void {
  today = null;
}
