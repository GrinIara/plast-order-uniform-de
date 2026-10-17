import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildCatalogData } from '../src/lib/catalog';
import { configSchema } from '../src/lib/config';
import type { Snapshot } from '../src/lib/types';

/**
 * Завантажує три CSV, валідує та пише public/catalog.json (знімок-fallback).
 * Звичайний режим: некоректні рядки пропускаються. --strict: будь-яка помилка завершує з кодом 1.
 */
const strict = process.argv.includes('--strict');
const config = configSchema.parse(JSON.parse(readFileSync('public/config.json', 'utf8')));

async function read(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    const local = `public/${url}`;
    if (!existsSync(local)) throw new Error(`Файл не знайдено: ${local}`);
    return readFileSync(local, 'utf8');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

try {
  const [catalog, synonyms, settings] = await Promise.all([read(config.csv.catalog), read(config.csv.synonyms), read(config.csv.settings)]);
  const data = buildCatalogData(catalog, synonyms, settings);

  for (const e of data.errors) console.warn(`catalog, рядок ${e.row}: ${e.message}`);
  if (data.rows.length === 0) throw new Error('У каталозі немає жодного коректного рядка');
  if (strict && data.errors.length > 0) {
    console.error(`Знайдено некоректних рядків: ${data.errors.length}`);
    process.exit(1);
  }

  const snapshot: Snapshot = { generatedAt: new Date().toISOString(), rows: data.rows, synonymGroups: data.synonymGroups, settings: data.settings };
  writeFileSync('public/catalog.json', JSON.stringify(snapshot));
  console.log(`Знімок записано: рядків ${data.rows.length}, пропущено ${data.errors.length}`);
} catch (e) {
  console.error(`Не вдалося зробити знімок каталогу: ${(e as Error).message}`);
  // Без знімка сайт працює, але без fallback. Звичайна збірка не падає; --strict падає.
  process.exit(strict ? 1 : 0);
}
