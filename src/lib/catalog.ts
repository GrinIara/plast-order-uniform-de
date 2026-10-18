import Papa from 'papaparse';
import { z } from 'zod';
import { ULADS, type CatalogData, type CatalogRow, type Product, type RowError, type Settings, type Stock, type SynonymGroup, type Uladh, type Variant } from './types';

const STOCK_MAP: Record<string, Stock> = {
  '': 'in',
  'немає': 'none',
  'під замовлення': 'order',
};

export function normalizeStock(value: string): Stock | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return STOCK_MAP[key] ?? null;
}

const rowSchema = z.object({
  product_id: z.string().trim().regex(/^[A-Za-z0-9-]+$/, 'product_id: лише латиниця, цифри, дефіс'),
  sku: z.string().trim().min(1, 'відсутній sku'),
  name_uk: z.string().trim().min(1, 'відсутній name_uk'),
  name_de: z.string().trim().default(''),
  category: z.string().trim().min(1, 'відсутня category'),
  synonyms: z.string().default(''),
  ulad: z.string().default(''),
  size: z.string().trim().min(1, 'відсутній size'),
  stock: z.string().default(''),
  price: z.string().trim().default(''),
  source_url: z.string().trim().refine((v) => /^https:\/\//.test(v), 'source_url має починатися з https://'),
  updated_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'updated_at: формат РРРР-ММ-ДД'),
});

function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return result.data;
}

export function parseCatalogCsv(text: string): { rows: CatalogRow[]; errors: RowError[] } {
  const rows: CatalogRow[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();

  parseCsv(text).forEach((raw, index) => {
    const rowNumber = index + 2;
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: rowNumber, message: parsed.error.issues.map((i) => i.message).join('; ') });
      return;
    }
    const d = parsed.data;
    const stock = normalizeStock(d.stock);
    if (stock === null) {
      errors.push({ row: rowNumber, message: `невідоме значення stock: «${d.stock}»` });
      return;
    }
    const ulads = splitList(d.ulad);
    const unknown = ulads.find((u) => !(ULADS as readonly string[]).includes(u));
    if (unknown) {
      errors.push({ row: rowNumber, message: `невідомий улад: «${unknown}» (допустимо: ${ULADS.join(', ')})` });
      return;
    }
    let price: number | null = null;
    if (d.price !== '') {
      price = Number(d.price.replace(',', '.'));
      if (!Number.isFinite(price) || price < 0) {
        errors.push({ row: rowNumber, message: `некоректна price: «${d.price}»` });
        return;
      }
    }
    if (seen.has(d.sku)) {
      errors.push({ row: rowNumber, message: `дублікат sku: ${d.sku}` });
      return;
    }
    seen.add(d.sku);
    rows.push({
      productId: d.product_id,
      sku: d.sku,
      nameUk: d.name_uk,
      nameDe: d.name_de,
      category: d.category,
      synonyms: splitList(d.synonyms),
      ulads: ulads as Uladh[],
      size: d.size,
      stock,
      price,
      sourceUrl: d.source_url,
      updatedAt: d.updated_at,
    });
  });
  return { rows, errors };
}

export function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseSynonymsCsv(text: string): SynonymGroup[] {
  return parseCsv(text)
    .map((r) => ({ group: (r.group ?? '').trim(), terms: splitList(r.terms ?? '') }))
    .filter((g) => g.terms.length > 0);
}

export function parseSettingsCsv(text: string): Settings {
  const out: Settings = {};
  for (const r of parseCsv(text)) {
    const key = (r.key ?? '').trim();
    if (key) out[key] = (r.value ?? '').trim();
  }
  return out;
}

export function buildCatalogData(catalogCsv: string, synonymsCsv: string, settingsCsv: string): CatalogData {
  const { rows, errors } = parseCatalogCsv(catalogCsv);
  return {
    rows,
    errors,
    synonymGroups: parseSynonymsCsv(synonymsCsv),
    settings: parseSettingsCsv(settingsCsv),
  };
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'МАЛА', 'ВЕЛИКА'];

export function compareSizes(a: string, b: string): number {
  const ia = SIZE_ORDER.indexOf(a.toUpperCase());
  const ib = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ia >= 0 && ib >= 0) return ia - ib;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b, 'uk');
}

const ULAD_KEYWORDS: Record<Uladh, string[]> = {
  Пташата: ['пташ', 'упп'],
  УПН: ['новак', 'новач', 'упн'],
  УПЮ: ['юнак', 'юнач', 'упю', 'упу'],
  УСП: ['старш', 'усп'],
  УПС: ['сеньйор', 'сеніор', 'упс'],
};

/** Улад за словами в назві/синонімах (УПП = пташата). Порожньо — улад не визначено. */
export function detectUlads(text: string): Uladh[] {
  const tokens = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  return ULADS.filter((u) => ULAD_KEYWORDS[u].some((k) => tokens.some((tok) => tok.startsWith(k))));
}

/** Групує рядки (один на розмір) у товари за product_id. */
export function groupProducts(rows: CatalogRow[]): Product[] {
  const map = new Map<string, Product>();
  for (const r of rows) {
    const variant: Variant = {
      sku: r.sku,
      size: r.size,
      stock: r.stock,
      price: r.price,
      sourceUrl: r.sourceUrl,
      updatedAt: r.updatedAt,
    };
    const existing = map.get(r.productId);
    if (existing) {
      existing.variants.push(variant);
      for (const s of r.synonyms) if (!existing.synonyms.includes(s)) existing.synonyms.push(s);
    } else {
      map.set(r.productId, {
        productId: r.productId,
        nameUk: r.nameUk,
        nameDe: r.nameDe,
        category: r.category,
        synonyms: [...r.synonyms],
        ulads: [],
        variants: [variant],
      });
    }
  }
  const products = [...map.values()];
  for (const p of products) {
    const explicit = rows.filter((r) => r.productId === p.productId).flatMap((r) => r.ulads ?? []);
    p.ulads = explicit.length > 0 ? ULADS.filter((u) => explicit.includes(u)) : detectUlads(`${p.nameUk} ${p.synonyms.join(' ')}`);
  }
  for (const p of products) p.variants.sort((a, b) => compareSizes(a.size, b.size));
  return products;
}

export function latestUpdate(rows: CatalogRow[]): string | null {
  return rows.reduce<string | null>((max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max), null);
}
