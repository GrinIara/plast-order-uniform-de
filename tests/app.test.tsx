import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { clearCart, resetCartCache } from '../src/lib/cart';

const files: Record<string, string> = {
  'config.json': JSON.stringify({
    ...JSON.parse(readFileSync('config.example.json', 'utf8')),
    form: { ...JSON.parse(readFileSync('config.example.json', 'utf8')).form, action: 'https://forms.example/formResponse' },
  }),
  'sample/catalog.csv': readFileSync('public/sample/catalog.csv', 'utf8'),
  'sample/synonyms.csv': readFileSync('public/sample/synonyms.csv', 'utf8'),
  'sample/settings.csv': readFileSync('public/sample/settings.csv', 'utf8'),
};

let posts: { url: string; body: URLSearchParams }[] = [];

beforeEach(() => {
  posts = [];
  window.location.hash = '#/';
  localStorage.clear();
  resetCartCache();
  clearCart();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posts.push({ url: input, body: init.body as URLSearchParams });
        return new Response('');
      }
      const key = String(input).replace(/^\//, '');
      return key in files ? new Response(files[key]) : new Response('', { status: 404 });
    }),
  );
});

afterEach(() => {
  cleanup();
});

describe('повний сценарій замовлення', () => {
  it('пошук → додати → кошик → форма → відправлення → реквізити', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Каталог завантажився й згрупований за категоріями.
    expect(await screen.findByRole('heading', { name: /Сорочки/ })).toBeTruthy();

    // «одностроій» (з друкарською помилкою) знаходить товари.
    await user.type(screen.getByRole('searchbox'), 'одностроій');
    expect(await screen.findByText(/Знайдено: \d/)).toBeTruthy();

    // Додати сорочку у розмірі S.
    await user.clear(screen.getByRole('searchbox'));
    await user.type(screen.getByRole('searchbox'), 'сорочка');
    const shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByRole('button', { name: /Оберіть розмір/ }).getAttribute('aria-disabled')).toBe('true');
    await user.click(within(shirt).getByRole('button', { name: /^S,/ }));
    await user.click(within(shirt).getByRole('button', { name: 'Додати до замовлення' }));
    expect(within(shirt).getByText(/Додано ✓ · S/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(1);

    // Кошик: позиція, реквізити та порожня форма не відправляється.
    window.location.hash = '#/cart';
    expect(await screen.findByText('Позицій: 1')).toBeTruthy();
    expect(screen.getByText(/DE00 0000/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Відправити' }));
    expect(await screen.findByText('Вкажіть ім\'я')).toBeTruthy();
    expect(posts).toHaveLength(0);

    // Заповнення та відправлення.
    await user.type(screen.getByLabelText("Ім'я"), 'Олена');
    await user.type(screen.getByLabelText('Прізвище'), 'Коваль');
    await user.type(screen.getByLabelText('Телефон'), '+49 151 2345678');
    await user.selectOptions(screen.getByLabelText('Улад'), 'УСП');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Відправити' }));

    await waitFor(() => expect(posts).toHaveLength(1));
    expect(posts[0].url).toBe('https://forms.example/formResponse');
    expect(posts[0].body.get('entry.555')).toContain('UPP-SHIRT-S / S');
    expect(posts[0].body.get('entry.333')).toBe('+49 151 2345678');
    expect(posts[0].body.get('entry.777')).toBe('УСП');
    expect(posts[0].body.has('entry.888')).toBe(false);

    // «Дякуємо» з реквізитами, кошик очищено.
    expect(await screen.findByText(/Дякуємо! Замовлення відправлено/)).toBeTruthy();
    expect(screen.getByText(/DE00 0000/)).toBeTruthy();
    expect(screen.getByText(/Однострій – Коваль Олена/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(0);
  });

  it('«немає» та «під замовлення» мають позначки, посилання відкривається безпечно', async () => {
    render(<App />);
    const shirt = (await screen.findByRole('heading', { name: 'Сорочка УПП' })).closest('article')!;
    expect(within(shirt).getByText('під замовлення')).toBeTruthy();
    expect(within(shirt).getByText('немає')).toBeTruthy();
    expect(within(shirt).getByRole('button', { name: /^S, в наявності/ })).toBeTruthy();
    expect(within(shirt).getByRole('link', { name: /Переглянути на scoutstyle/ }).getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('при мережевій помилці відправлення кошик і дані зберігаються', async () => {
    const user = userEvent.setup();
    render(<App />);
    const cap = (await screen.findByRole('heading', { name: 'Пілотка' })).closest('article')!;
    await user.click(within(cap).getByRole('button', { name: 'Додати до замовлення' }));
    window.location.hash = '#/cart';
    await screen.findByText('Позицій: 1');

    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new TypeError('network');
    });
    await user.type(screen.getByLabelText("Ім'я"), 'Олена');
    await user.type(screen.getByLabelText('Прізвище'), 'Коваль');
    await user.type(screen.getByLabelText('Телефон'), '+49 151 2345678');
    await user.selectOptions(screen.getByLabelText('Улад'), 'УСП');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Відправити' }));

    expect(await screen.findByText(/Не вдалося відправити\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Скопіювати текст замовлення' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('plast-cart-v1')!)).toHaveLength(1);
  });
});
