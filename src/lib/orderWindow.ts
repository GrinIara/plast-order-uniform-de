import { normalizeDate } from './catalog';
import type { Settings } from './types';

export const ORDER_OPEN = 'order_open';
export const ORDER_CLOSE = 'order_close';

export type OrderWindowError =
  | { reason: 'invalidDate'; key: typeof ORDER_OPEN | typeof ORDER_CLOSE; raw: string }
  | { reason: 'startAfterEnd'; openRaw: string; closeRaw: string };

export type OrderWindow =
  | { kind: 'none' }
  | { kind: 'valid'; start: string | null; end: string | null } // ISO РРРР-ММ-ДД; щонайменше одна межа задана
  | { kind: 'invalid'; errors: OrderWindowError[] };

export type OrderWindowState =
  | { status: 'notConfigured' }
  | { status: 'open'; start: string | null; end: string | null }
  | { status: 'beforeStart'; start: string }
  | { status: 'afterEnd' }
  | { status: 'invalid' };

/** Читає order_open / order_close з settings. Порожнє значення — межі немає. */
export function parseOrderWindow(settings: Settings): OrderWindow {
  const openRaw = (settings[ORDER_OPEN] ?? '').trim();
  const closeRaw = (settings[ORDER_CLOSE] ?? '').trim();
  const errors: OrderWindowError[] = [];

  const read = (key: typeof ORDER_OPEN | typeof ORDER_CLOSE, raw: string): string | null => {
    if (raw === '') return null;
    const iso = normalizeDate(raw);
    if (iso === null) errors.push({ reason: 'invalidDate', key, raw });
    return iso;
  };
  const start = read(ORDER_OPEN, openRaw);
  const end = read(ORDER_CLOSE, closeRaw);

  if (errors.length > 0) return { kind: 'invalid', errors };
  if (start !== null && end !== null && start > end) {
    return { kind: 'invalid', errors: [{ reason: 'startAfterEnd', openRaw, closeRaw }] };
  }
  if (start === null && end === null) return { kind: 'none' };
  return { kind: 'valid', start, end };
}

const berlinFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Календарна дата РРРР-ММ-ДД у Europe/Berlin для моменту `now`. */
export function berlinDate(now: Date): string {
  const parts = berlinFormat.formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function orderWindowState(win: OrderWindow, today: string): OrderWindowState {
  if (win.kind === 'none') return { status: 'notConfigured' };
  if (win.kind === 'invalid') return { status: 'invalid' };
  if (win.start !== null && today < win.start) return { status: 'beforeStart', start: win.start };
  if (win.end !== null && today > win.end) return { status: 'afterEnd' };
  return { status: 'open', start: win.start, end: win.end };
}

export function isOrderingOpen(state: OrderWindowState): boolean {
  return state.status === 'notConfigured' || state.status === 'open';
}

/** Відправлення заблоковане, якщо вікно закрите і немає часткового замовлення для довідправлення. */
export function isSubmitBlocked(state: OrderWindowState, hasPartial: boolean): boolean {
  return !isOrderingOpen(state) && !hasPartial;
}

/** Один рядок журналу на кожну помилку; сирі значення — лише для консолі та CI-журналу. */
export function describeOrderWindowErrors(errors: OrderWindowError[]): string[] {
  return errors.map((e) =>
    e.reason === 'invalidDate'
      ? `settings: ${e.key} — некоректна дата «${e.raw}»`
      : `settings: ${ORDER_OPEN} «${e.openRaw}» пізніше за ${ORDER_CLOSE} «${e.closeRaw}»`,
  );
}
