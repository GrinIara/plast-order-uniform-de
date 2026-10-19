import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { clearCart, resetCartCache } from '../src/lib/cart';
import { resetPendingOrderCache } from '../src/lib/pendingOrder';
import { files, installFetchStub } from './harness';

const original = files['sample/catalog.csv'];
const header = original.split('\n')[0];
const CSV = [
  header,
  'MIX,MIX-A,Тестовий виріб,,Сорочки,,Пташата,A,,100,https://scoutstyle.net/,2026-10-01',
  'MIX,MIX-B,Тестовий виріб,,Сорочки,,Пташата,B,,250,https://scoutstyle.net/,2026-10-01',
  'MIX,MIX-C,Тестовий виріб,,Сорочки,,Пташата,C,,,https://scoutstyle.net/,2026-10-01',
].join('\n');

beforeEach(() => {
  files['sample/catalog.csv'] = CSV;
  window.location.hash = '#/';
  localStorage.clear();
  resetCartCache();
  resetPendingOrderCache();
  clearCart();
  installFetchStub();
});
afterEach(() => {
  cleanup();
  files['sample/catalog.csv'] = original;
});

async function card() {
  return (await screen.findByRole('heading', { name: 'Тестовий виріб' })).closest('article')!;
}

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-10, AC-9: без вибору — ціна першого розміру з ціною; вибраний розмір міняє ціну; без ціни — без рядка ціни', async () => {
    const user = userEvent.setup();
    render(<App />);
    const c = await card();
    expect(c.querySelector('.card__price')!.textContent).toContain('100');
    await user.click(within(c).getByRole('button', { name: /^B,/ }));
    expect(c.querySelector('.card__price')!.textContent).toContain('250');
    await user.click(within(c).getByRole('button', { name: /^C,/ }));
    expect(c.querySelector('.card__price')).toBeNull();
  });

  it('AC-1, AC-2, AC-11, AC-15, AC-8, AC-7: додавання дає кількість 1, лічильник і «Прибрати», позначка ×N, окремі розміри', async () => {
    const user = userEvent.setup();
    render(<App />);
    const c = await card();
    await user.click(within(c).getByRole('button', { name: /^A,/ }));
    await user.click(within(c).getByRole('button', { name: 'Додати до замовлення' }));
    expect(within(c).getByRole('button', { name: 'Збільшити кількість: Тестовий виріб, A' })).toBeTruthy();
    expect(within(c).getByRole('button', { name: 'Прибрати' })).toBeTruthy();
    expect(within(c).queryByRole('button', { name: 'Додати до замовлення' })).toBeNull();
    expect(within(c).getByRole('button', { name: /^A,/ }).textContent).toBe('✓ A');

    await user.click(within(c).getByRole('button', { name: 'Збільшити кількість: Тестовий виріб, A' }));
    expect(within(c).getByRole('button', { name: /^A,/ }).textContent).toBe('✓ A ×2');
    expect(within(c).getByRole('button', { name: /^A,.*у замовленні: 2/ })).toBeTruthy();

    await user.click(within(c).getByRole('button', { name: /^B,/ }));
    await user.click(within(c).getByRole('button', { name: 'Додати до замовлення' }));
    expect(within(c).getByRole('button', { name: /^B,/ }).textContent).toBe('✓ B');
    expect(within(c).getByRole('button', { name: /^A,/ }).textContent).toBe('✓ A ×2');

    await user.click(within(c).getByRole('button', { name: 'Прибрати' }));
    expect(within(c).getByRole('button', { name: 'Додати до замовлення' })).toBeTruthy();
    expect(within(c).getByRole('button', { name: /^B,/ }).textContent).toBe('B');
  });
});
