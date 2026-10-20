import { useSyncExternalStore } from 'react';

export type Route = 'catalog' | 'cart' | 'thanks' | 'faq' | 'impressum' | 'datenschutz' | 'notfound';

const ROUTES: Record<string, Route> = {
  '': 'catalog',
  '/': 'catalog',
  '/cart': 'cart',
  '/thanks': 'thanks',
  '/faq': 'faq',
  '/impressum': 'impressum',
  '/datenschutz': 'datenschutz',
};

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '');
  if (path.startsWith('/faq/')) return 'faq';
  return ROUTES[path] ?? 'notfound';
}

/** id розмірної сітки з адреси `#/faq/<id>` або null. */
export function chartFromHash(hash: string): string | null {
  const m = /^#?\/faq\/([\w-]+)$/.exec(hash);
  return m ? m[1] : null;
}

export function navigate(path: string): void {
  window.location.hash = path;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}

export function useRoute(): Route {
  return parseHash(useHash());
}
