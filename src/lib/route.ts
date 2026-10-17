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
  return ROUTES[path] ?? 'notfound';
}

export function navigate(path: string): void {
  window.location.hash = path;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseHash(hash);
}
