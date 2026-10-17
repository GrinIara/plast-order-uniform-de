import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { groupProducts, parseCatalogCsv, parseSynonymsCsv } from '../src/lib/catalog';
import { createSearch } from '../src/lib/search';

const products = groupProducts(parseCatalogCsv(readFileSync('tests/fixtures/catalog.csv', 'utf8')).rows);
const groups = parseSynonymsCsv(readFileSync('tests/fixtures/synonyms.csv', 'utf8'));
const search = createSearch(products, groups);
const ids = (query: string) => search.search({ query, category: null, size: null }).map((p) => p.productId);

describe('пошук', () => {
  it('«УПП» знаходить товари за синонімами', () => {
    expect(ids('УПП')).toEqual(expect.arrayContaining(['UPP-SHIRT', 'UPP-CAP']));
  });

  it('«сорочка» знаходить сорочку', () => {
    expect(ids('сорочка')).toContain('UPP-SHIRT');
  });

  it('«одностроій» (з друкарською помилкою) теж дає результат', () => {
    expect(ids('одностроій').length).toBeGreaterThan(0);
  });

  it('порожній запит повертає все', () => {
    expect(ids('')).toHaveLength(2);
  });

  it('фільтрує за категорією та розміром', () => {
    expect(search.search({ query: '', category: 'Сорочки', size: null }).map((p) => p.productId)).toEqual(['UPP-SHIRT']);
    expect(search.search({ query: '', category: null, size: 'one size' }).map((p) => p.productId)).toEqual(['UPP-CAP']);
  });

  it('безглуздий запит нічого не знаходить', () => {
    expect(ids('zzzzqqq')).toEqual([]);
  });
});
