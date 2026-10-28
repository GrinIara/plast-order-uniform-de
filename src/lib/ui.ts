import { t } from './i18n';
import type { OrderWindowState } from './orderWindow';

/** Відмінок слова «позиція» для числа. */
export function itemsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return t('plural.one');
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return t('plural.few');
  return t('plural.many');
}

/** Відмінок слова «штука» для числа. */
export function unitsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return t('plural.unit.one');
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return t('plural.unit.few');
  return t('plural.unit.many');
}

/** Пастельні відтінки заглушок за порядком категорії (токени --cat1…--cat6). */
export function categoryTint(index: number): string {
  return `var(--cat${(index % 6) + 1})`;
}

export function categoryMark(category: string): string {
  return category.replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase();
}

/** РРРР-ММ-ДД → ДД.ММ.РРРР (інші значення повертає без змін). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Текст про вікно замовлень для банера й підказки; null — вікно не налаштоване. Дати лише з розібраного значення. */
export function orderWindowText(state: OrderWindowState): string | null {
  switch (state.status) {
    case 'notConfigured':
      return null;
    case 'open':
      if (state.start && state.end) return t('window.open', { start: formatDate(state.start), end: formatDate(state.end) });
      if (state.end) return t('window.openUntil', { end: formatDate(state.end) });
      return t('window.openFrom', { start: formatDate(state.start ?? '') });
    case 'beforeStart':
      return t('window.beforeStart', { start: formatDate(state.start) });
    case 'afterEnd':
    case 'invalid':
      return t('window.closed');
  }
}

const priceFormat = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Ціна в євро: 930 → «930 €», 24.5 → «24,50 €». */
export function formatPrice(price: number): string {
  const text = priceFormat.format(price);
  return `${Number.isInteger(price) ? text : text.replace(/[,.](\d)(?!\d)/, ',$10')}\u00A0€`;
}
