export type Stock = 'in' | 'order' | 'none';

export interface Variant {
  sku: string;
  size: string;
  stock: Stock;
  price: number | null;
  sourceUrl: string;
  updatedAt: string;
}

export interface Product {
  productId: string;
  nameUk: string;
  nameDe: string;
  category: string;
  synonyms: string[];
  variants: Variant[];
}

export interface RowError {
  /** Номер рядка в таблиці (заголовок = 1, перший рядок даних = 2). */
  row: number;
  message: string;
}

export interface CatalogRow extends Variant {
  productId: string;
  nameUk: string;
  nameDe: string;
  category: string;
  synonyms: string[];
}

export interface SynonymGroup {
  group: string;
  terms: string[];
}

export type Settings = Record<string, string>;

export interface CatalogData {
  rows: CatalogRow[];
  synonymGroups: SynonymGroup[];
  settings: Settings;
  errors: RowError[];
}

export interface Snapshot {
  generatedAt: string;
  rows: CatalogRow[];
  synonymGroups: SynonymGroup[];
  settings: Settings;
}

export interface CartItem {
  sku: string;
  productId: string;
  name: string;
  size: string;
  stock: Stock;
}

export const ULADS = ['Пташата', 'УПН', 'УПЮ', 'УСП', 'УПС'] as const;
export type Uladh = (typeof ULADS)[number];
