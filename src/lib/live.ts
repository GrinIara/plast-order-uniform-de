import { useSyncExternalStore } from 'react';

let message = '';
const listeners = new Set<() => void>();

/** Оголошення для скрінрідерів (aria-live). */
export function announce(text: string): void {
  message = text;
  listeners.forEach((l) => l());
}

export function useLive(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => message,
    () => message,
  );
}
