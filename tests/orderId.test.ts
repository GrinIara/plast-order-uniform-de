import { describe, expect, it } from 'vitest';
import { createOrderId, isOrderId, ORDER_ID_RE } from '../src/lib/orderId';

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-39: номер має формат РРРРММДД-XXXX, префікс — локальна дата, байти ≥ 248 пропускаються', () => {
    for (let n = 0; n < 200; n++) expect(createOrderId()).toMatch(ORDER_ID_RE);
    expect(createOrderId(new Date(2026, 9, 19)).startsWith('20261019-')).toBe(true);
    const stream = [255, 248, 0, 250, 1, 2, 3];
    let pos = 0;
    const id = createOrderId(new Date(2026, 9, 19), (n) => Uint8Array.from({ length: n }, () => stream[pos++] ?? 0));
    expect(id).toBe('20261019-2345');
    expect(isOrderId(id)).toBe(true);
    expect(isOrderId('20261019-0OIL')).toBe(false);
    expect(isOrderId(5)).toBe(false);
  });
});
