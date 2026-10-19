import { readFileSync } from 'node:fs';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import { resetCartCache } from '../src/lib/cart';

const example = JSON.parse(readFileSync('config.example.json', 'utf8'));

export const files: Record<string, string> = {
  'config.json': JSON.stringify({ ...example, form: { ...example.form, action: 'https://forms.example/formResponse' } }),
  'sample/catalog.csv': readFileSync('public/sample/catalog.csv', 'utf8'),
  'sample/synonyms.csv': readFileSync('public/sample/synonyms.csv', 'utf8'),
  'sample/settings.csv': readFileSync('public/sample/settings.csv', 'utf8'),
};

export interface Post {
  url: string;
  body: URLSearchParams;
  startedAt: number;
}

export const posts: Post[] = [];

type PostHandler = (index: number) => Promise<Response> | Response;

/** Підставляє fetch: GET віддає зразкові файли, POST записується в `posts`. */
export function installFetchStub(onPost: PostHandler = () => new Response('')) {
  posts.length = 0;
  const stub = vi.fn(async (input: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posts.push({ url: input, body: init.body as URLSearchParams, startedAt: performance.now() });
      return onPost(posts.length);
    }
    const key = String(input).replace(/^\//, '');
    return key in files ? new Response(files[key]) : new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}

export async function fillContactForm(user: UserEvent) {
  await user.type(screen.getByLabelText("Ім'я"), 'Олена');
  await user.type(screen.getByLabelText('Прізвище'), 'Коваль');
  await user.type(screen.getByLabelText("Ім'я дитини"), '  Олеся ');
  await user.type(screen.getByLabelText('Прізвище дитини'), 'Коваль');
  await user.type(screen.getByLabelText('Телефон'), '+49 151 2345678');
  await user.selectOptions(screen.getByLabelText('Улад'), 'УСП');
  await user.click(screen.getByRole('checkbox'));
}

const SEED: Record<string, { productId: string; name: string; size: string; stock: 'in' | 'order' | 'none' }> = {
  'UPP-SHIRT-S': { productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'S', stock: 'in' },
  'UPP-SHIRT-M': { productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'M', stock: 'order' },
  'UPP-SHIRT-L': { productId: 'UPP-SHIRT', name: 'Сорочка УПП', size: 'L', stock: 'none' },
  'UPP-CAP-ONE': { productId: 'UPP-CAP', name: 'Пілотка', size: 'one size', stock: 'in' },
};

/** Кладе рядки кошика у localStorage (SKU із public/sample/catalog.csv); кількість за замовчуванням 1. */
export function seedCart(lines: (string | [string, number])[]): void {
  const items = lines.map((l) => {
    const [sku, quantity] = typeof l === 'string' ? [l, 1] : l;
    return { sku, ...SEED[sku], quantity };
  });
  localStorage.setItem('plast-cart-v1', JSON.stringify(items));
  resetCartCache();
}
