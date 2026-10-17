import MiniSearch from 'minisearch';
import type { Product, SynonymGroup } from './types';

export interface SearchFilters {
  query: string;
  category: string | null;
  size: string | null;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFC').replace(/[ʼ’']/g, '').trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[\s,.;:/()-]+/)
    .filter(Boolean);
}

/** Чи схожий токен запиту на слово синонімів (точно, префікс або з друкарською помилкою). */
function termMatches(token: string, term: string): boolean {
  if (token === term) return true;
  if (token.length >= 3 && term.startsWith(token)) return true;
  const allowed = token.length <= 3 ? 0 : token.length <= 6 ? 1 : 2;
  return allowed > 0 && levenshtein(token, term) <= allowed;
}

export function expandQuery(query: string, groups: SynonymGroup[]): string[] {
  const tokens = tokenize(query);
  const out = new Set(tokens);
  for (const token of tokens) {
    for (const group of groups) {
      const terms = group.terms.flatMap((t) => tokenize(t));
      if (terms.some((t) => termMatches(token, t))) terms.forEach((t) => out.add(t));
    }
  }
  return [...out];
}

export interface CatalogSearch {
  search(filters: SearchFilters): Product[];
}

export function createSearch(products: Product[], groups: SynonymGroup[]): CatalogSearch {
  const index = new MiniSearch<{ id: string; name: string; nameDe: string; category: string; synonyms: string }>({
    fields: ['name', 'nameDe', 'category', 'synonyms'],
    storeFields: ['id'],
    processTerm: (term) => normalize(term),
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'OR', boost: { name: 2, synonyms: 1.5 } },
  });
  index.addAll(
    products.map((p) => ({
      id: p.productId,
      name: p.nameUk,
      nameDe: p.nameDe,
      category: p.category,
      synonyms: p.synonyms.join(' '),
    })),
  );
  const byId = new Map(products.map((p) => [p.productId, p]));

  return {
    search({ query, category, size }) {
      let result: Product[];
      if (query.trim() === '') {
        result = products;
      } else {
        const terms = expandQuery(query, groups);
        const hits = index.search(terms.join(' '));
        result = hits.map((h) => byId.get(h.id as string)).filter((p): p is Product => Boolean(p));
      }
      if (category) result = result.filter((p) => p.category === category);
      if (size) result = result.filter((p) => p.variants.some((v) => v.size === size));
      return result;
    },
  };
}

export function groupByCategory(products: Product[]): { category: string; products: Product[] }[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const list = map.get(p.category) ?? [];
    list.push(p);
    map.set(p.category, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'uk'))
    .map(([category, list]) => ({ category, products: list }));
}
