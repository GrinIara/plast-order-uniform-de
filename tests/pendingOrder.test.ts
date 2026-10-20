import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configSchema } from '../src/lib/config';
import { clearPendingOrder, getPendingOrder, markLineSent, partialStatus, resetPendingOrderCache, startPendingOrder } from '../src/lib/pendingOrder';
import { resolveLines } from '../src/lib/pricing';
import { sendOrder, type ContactForm } from '../src/lib/submit';
import type { CartItem } from '../src/lib/types';
import example from '../config.example.json';

const config = configSchema.parse({ ...example, form: { ...example.form, action: 'https://forms.example/formResponse' } });
const f = config.form.fields;
const ID = '20261019-7KQX';
const form: ContactForm = { firstName: 'О', lastName: 'К', phone: '+49 151 2345678', station: 'D', uladh: 'УСП', unit: '', consent: true, childFirstName: 'Д', childLastName: 'К' };
const items: CartItem[] = ['A', 'B', 'C'].map((s) => ({ sku: `SKU-${s}`, productId: 'P', name: s, size: 'M', stock: 'in', quantity: 1, nextSize: false }));
const lines = resolveLines(items, []);

type Call = { body: URLSearchParams; resolve: () => void; reject: () => void };
let calls: Call[];
let sent: Set<string>;

function stubFetch(behaviour: (n: number) => 'ok' | 'fail' | 'hang') {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      const n = calls.length + 1;
      const mode = behaviour(n);
      return new Promise<Response>((resolve, reject) => {
        calls.push({ body: init.body as URLSearchParams, resolve: () => resolve(new Response('')), reject: () => reject(new TypeError('network')) });
        if (mode === 'ok') resolve(new Response(''));
        if (mode === 'fail') reject(new TypeError('network'));
      });
    }),
  );
}

const run = (timeoutMs?: number) =>
  sendOrder(config, form, lines, {
    orderId: ID,
    isSent: (sku) => sent.has(sku),
    onSent: (sku) => sent.add(sku),
    onProgress: () => {},
    timeoutMs,
  });

beforeEach(() => {
  sent = new Set();
  localStorage.clear();
  resetPendingOrderCache();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-30: три запити по черзі, кожен починається після завершення попереднього', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: RequestInit) => {
        calls.push({ body: init.body as URLSearchParams, resolve: () => {}, reject: () => {} });
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return new Response('');
      }),
    );
    expect(await run()).toEqual({ ok: true });
    expect(calls.map((c) => c.body.get(f.sku))).toEqual(['SKU-A', 'SKU-B', 'SKU-C']);
    expect(maxInFlight).toBe(1);
  });

  it('AC-43, AC-45, AC-39: збій на 2-му запиті зупиняє спробу; повтор шле позиції 2 і 3 з тим самим номером без «Суми»', async () => {
    stubFetch((n) => (n === 2 ? 'fail' : 'ok'));
    expect(await run()).toEqual({ ok: false, sent: 1 });
    expect(calls).toHaveLength(2);
    stubFetch(() => 'ok');
    expect(await run()).toEqual({ ok: true });
    expect(calls.map((c) => c.body.get(f.sku))).toEqual(['SKU-B', 'SKU-C']);
    expect(calls.every((c) => c.body.get(f.orderId) === ID)).toBe(true);
    expect(calls.every((c) => !c.body.has(f.total!))).toBe(true);
  });

  it('AC-35: «Сума» у кожному запиті — ціна × кількість цієї позиції', async () => {
    const priced = resolveLines(items, [
      { productId: 'P', nameUk: 'P', nameDe: '', category: '', synonyms: [], ulads: [], variants: items.map((i) => ({ sku: i.sku, size: 'M', stock: 'in' as const, price: 10, sourceUrl: '', updatedAt: '' })) },
    ]);
    stubFetch(() => 'ok');
    await sendOrder(config, form, priced, { orderId: ID, isSent: () => false, onSent: () => {}, onProgress: () => {} });
    expect(calls.map((c) => c.body.get(f.total!))).toEqual(priced.map((l) => String(l.lineTotal)));
  });

  it('AC-66: запит, що завис, через 15 с вважається невдалим; 3-й не робиться; повтор починає з 2-ї', async () => {
    vi.useFakeTimers();
    stubFetch((n) => (n === 2 ? 'hang' : 'ok'));
    const attempt = run();
    await vi.advanceTimersByTimeAsync(14_999);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await attempt).toEqual({ ok: false, sent: 1 });
    expect(calls).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
    stubFetch(() => 'ok');
    await run();
    expect(calls[0].body.get(f.sku)).toBe('SKU-B');
  });

  it('AC-51: пошкоджений JSON або номер у хибному форматі відкидаються', () => {
    localStorage.setItem('plast-order-v1', '{broken');
    expect(getPendingOrder()).toBeNull();
    expect(localStorage.getItem('plast-order-v1')).toBeNull();
    resetPendingOrderCache();
    localStorage.setItem('plast-order-v1', JSON.stringify({ orderId: 'bad-id', sentSkus: [] }));
    expect(getPendingOrder()).toBeNull();
  });

  it('NFR-4, AC-39: у сховищі лише orderId і sentSkus; номер не змінюється між рядками', () => {
    startPendingOrder(ID);
    startPendingOrder('20261019-AAAA');
    markLineSent('SKU-A');
    expect(Object.keys(JSON.parse(localStorage.getItem('plast-order-v1')!)).sort()).toEqual(['orderId', 'sentSkus']);
    resetPendingOrderCache();
    expect(getPendingOrder()).toEqual({ orderId: ID, sentSkus: ['SKU-A'] });
    expect(partialStatus(items, getPendingOrder())).toEqual({ orderId: ID, sent: 1, total: 3 });
    clearPendingOrder();
    expect(localStorage.getItem('plast-order-v1')).toBeNull();
  });
});
