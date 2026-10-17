import { t } from './i18n';

/** Відмінок слова «позиція» для числа. */
export function itemsWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return t('plural.one');
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return t('plural.few');
  return t('plural.many');
}

/** Пастельні відтінки заглушок за порядком категорії (токени --cat1…--cat6). */
export function categoryTint(index: number): string {
  return `var(--cat${(index % 6) + 1})`;
}

export function categoryMark(category: string): string {
  return category.replace(/[^\p{L}]/gu, '').slice(0, 2).toUpperCase();
}
