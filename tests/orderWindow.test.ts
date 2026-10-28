import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  berlinDate,
  describeOrderWindowErrors,
  isOrderingOpen,
  isSubmitBlocked,
  orderWindowState,
  parseOrderWindow,
  type OrderWindow,
} from '../src/lib/orderWindow';
import { getOrderWindowToday, recheckOrderWindow, resetOrderWindowClock } from '../src/lib/orderWindowClock';
import { orderWindowText } from '../src/lib/ui';

const text = (settings: Record<string, string>, today: string) => orderWindowText(orderWindowState(parseOrderWindow(settings), today));
const open = (settings: Record<string, string>, today: string) => isOrderingOpen(orderWindowState(parseOrderWindow(settings), today));
const both = { order_open: '2026-11-01', order_close: '2026-11-15' };

afterEach(() => {
  vi.useRealTimers();
  resetOrderWindowClock();
});

describe('SPEC-2026-10-28-ordering-window', () => {
  it('AC-1: усі три формати дат розбираються однаково', () => {
    const expected: OrderWindow = { kind: 'valid', start: '2026-11-01', end: '2026-11-15' };
    expect(parseOrderWindow({ order_open: '01.11.2026', order_close: '15.11.2026' })).toEqual(expected);
    expect(parseOrderWindow(both)).toEqual(expected);
    expect(parseOrderWindow({ order_open: '11/1/26', order_close: '11/15/26' })).toEqual(expected);
    expect(text({ order_open: '01.11.2026', order_close: '15.11.2026' }, '2026-11-05')).toBe('Відсилайте замовлення від 01.11.2026 і до 15.11.2026');
  });

  it('AC-2: сьогодні — календарна дата Берліна, межі включні', () => {
    expect(berlinDate(new Date('2026-10-31T23:00:00Z'))).toBe('2026-11-01');
    expect(berlinDate(new Date('2026-11-15T22:59:59Z'))).toBe('2026-11-15');
    expect(berlinDate(new Date('2026-11-15T23:00:00Z'))).toBe('2026-11-16');
    expect(open(both, berlinDate(new Date('2026-10-31T23:00:00Z')))).toBe(true);
    expect(open(both, berlinDate(new Date('2026-11-15T22:59:59Z')))).toBe(true);
    expect(open(both, berlinDate(new Date('2026-11-15T23:00:00Z')))).toBe(false);
  });

  it('NFR-2: перехід на літній і зимовий час', () => {
    expect(berlinDate(new Date('2026-03-28T22:59:59Z'))).toBe('2026-03-28');
    expect(berlinDate(new Date('2026-03-28T23:00:00Z'))).toBe('2026-03-29');
    expect(berlinDate(new Date('2026-07-01T21:59:59Z'))).toBe('2026-07-01');
    expect(berlinDate(new Date('2026-07-01T22:00:00Z'))).toBe('2026-07-02');
    expect(berlinDate(new Date('2026-10-24T22:00:00Z'))).toBe('2026-10-25');
    expect(berlinDate(new Date('2026-10-25T22:59:59Z'))).toBe('2026-10-25');
    expect(berlinDate(new Date('2026-10-25T23:00:00Z'))).toBe('2026-10-26');
  });

  it('AC-3, AC-8: порожні налаштування — відкрито, без тексту', () => {
    for (const s of [{} as Record<string, string>, { order_open: '', order_close: '  ' }]) {
      expect(orderWindowState(parseOrderWindow(s), '2026-11-05')).toEqual({ status: 'notConfigured' });
      expect(open(s, '2026-11-05')).toBe(true);
      expect(text(s, '2026-11-05')).toBeNull();
    }
  });

  it('AC-4, AC-11: некоректні значення закривають прийом', () => {
    const cases: Record<string, string>[] = [
      { order_open: '2026-13-01' },
      { order_open: '2026-02-30', order_close: '2026-11-15' },
      { order_close: 'abc' },
      { order_open: '2026-11-20', order_close: '2026-11-10' },
    ];
    for (const s of cases) {
      expect(parseOrderWindow(s).kind).toBe('invalid');
      expect(open(s, '2026-11-05')).toBe(false);
      expect(text(s, '2026-11-05')).toBe('Прийом замовлень закрито');
    }
  });

  it('AC-5: опис помилок називає ключ і сире значення', () => {
    const win = parseOrderWindow({ order_close: '2026-11-1x' });
    if (win.kind !== 'invalid') throw new Error('очікувалось invalid');
    const lines = describeOrderWindowErrors(win.errors);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('order_close');
    expect(lines[0]).toContain('2026-11-1x');
    const swapped = parseOrderWindow({ order_open: '2026-11-20', order_close: '2026-11-10' });
    if (swapped.kind !== 'invalid') throw new Error('очікувалось invalid');
    const line = describeOrderWindowErrors(swapped.errors)[0];
    for (const part of ['order_open', 'order_close', '2026-11-20', '2026-11-10']) expect(line).toContain(part);
  });

  it('AC-26: сире значення не потрапляє в текст', () => {
    const s = { order_open: '<b>1.11</b>' };
    expect(parseOrderWindow(s).kind).toBe('invalid');
    const shown = text(s, '2026-11-05') ?? '';
    expect(shown).not.toContain('<b>');
    expect(shown).not.toContain('1.11');
  });

  it('AC-27, AC-29: лише order_close', () => {
    const s = { order_close: '2026-11-15' };
    expect(open(s, '2026-10-28')).toBe(true);
    expect(text(s, '2026-10-28')).toBe('Відсилайте замовлення до 15.11.2026');
    expect(open(s, '2026-11-15')).toBe(true);
    expect(orderWindowState(parseOrderWindow(s), '2026-11-16')).toEqual({ status: 'afterEnd' });
  });

  it('AC-28, AC-30, AC-9: лише order_open', () => {
    const s = { order_open: '2026-11-01' };
    expect(orderWindowState(parseOrderWindow(s), '2026-10-31')).toEqual({ status: 'beforeStart', start: '2026-11-01' });
    expect(text(s, '2026-10-31')).toBe('Замовлення відкриються 01.11.2026');
    expect(open(s, '2026-10-31')).toBe(false);
    expect(open(s, '2026-11-01')).toBe(true);
    expect(open(s, '2027-01-01')).toBe(true);
    expect(text(s, '2027-01-01')).toBe('Відсилайте замовлення від 01.11.2026');
  });

  it('AC-10: після завершення — прийом закрито', () => {
    expect(text(both, '2026-11-16')).toBe('Прийом замовлень закрито');
  });

  it('E2: одноденне вікно відкрите лише в цей день', () => {
    const s = { order_open: '2026-11-10', order_close: '2026-11-10' };
    expect(open(s, '2026-11-09')).toBe(false);
    expect(open(s, '2026-11-10')).toBe(true);
    expect(open(s, '2026-11-11')).toBe(false);
  });

  it('годинник: recheck підхоплює нову дату за Берліном', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T12:00:00Z'));
    resetOrderWindowClock();
    expect(getOrderWindowToday()).toBe('2026-11-05');
    vi.setSystemTime(new Date('2026-11-15T23:30:00Z'));
    expect(getOrderWindowToday()).toBe('2026-11-05');
    recheckOrderWindow();
    expect(getOrderWindowToday()).toBe('2026-11-16');
  });

  it('AC-16/AC-21: submit is blocked outside the window unless a partial order exists', () => {
    const closed = orderWindowState(parseOrderWindow(both), '2026-11-16');
    const inside = orderWindowState(parseOrderWindow(both), '2026-11-05');
    expect(isSubmitBlocked(closed, false)).toBe(true);
    expect(isSubmitBlocked(closed, true)).toBe(false);
    expect(isSubmitBlocked(inside, false)).toBe(false);
  });
});
