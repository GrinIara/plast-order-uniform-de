import uk from '../i18n/uk.json';

type Dict = typeof uk;
export type TKey = keyof Dict;

/** Повертає текст за ключем; `{name}` у тексті замінюється значеннями з params. */
export function t(key: TKey, params?: Record<string, string | number>): string {
  const template = uk[key] as string;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}
