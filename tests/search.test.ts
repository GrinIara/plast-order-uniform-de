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

  it('фільтр за уладом показує лише товари цього уладу', () => {
    const byUladh = (uladh: 'Пташата' | 'УПН') => search.search({ query: '', category: null, size: null, uladh }).map((p) => p.productId);
    expect(byUladh('Пташата')).toEqual(expect.arrayContaining(['UPP-SHIRT', 'UPP-CAP']));
    expect(byUladh('УПН')).toEqual([]);
  });

  it('фільтрує за категорією та розміром', () => {
    expect(search.search({ query: '', category: 'Сорочки', size: null }).map((p) => p.productId)).toEqual(['UPP-SHIRT']);
    expect(search.search({ query: '', category: null, size: 'one size' }).map((p) => p.productId)).toEqual(['UPP-CAP']);
  });

  it('безглуздий запит нічого не знаходить', () => {
    expect(ids('zzzzqqq')).toEqual([]);
  });
});

describe('товар для кількох уладів', () => {
  const csv = [
    'product_id,sku,name_uk,name_de,category,synonyms,ulad,size,stock,price,source_url,updated_at',
    'BELT,BELT-M,Пояс,,Аксесуари,,"УПН, УПЮ",M,,100,https://scoutstyle.net/,2026-10-01',
  ].join('\n');
  const multi = createSearch(groupProducts(parseCatalogCsv(csv).rows), []);
  const by = (uladh: 'УПН' | 'УПЮ' | 'УСП') => multi.search({ query: '', category: null, size: null, uladh }).map((p) => p.productId);

  it('показується в кожному зазначеному уладі й не показується в інших', () => {
    expect(by('УПН')).toEqual(['BELT']);
    expect(by('УПЮ')).toEqual(['BELT']);
    expect(by('УСП')).toEqual([]);
  });
});
