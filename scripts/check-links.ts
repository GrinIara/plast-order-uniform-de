import { readFileSync } from 'node:fs';
import type { Snapshot } from '../src/lib/types';

/** Перевіряє source_url зі знімка каталогу. 404/410 — биті (код 1); 403/429/мережа — лише попередження. */
const snapshot = JSON.parse(readFileSync('public/catalog.json', 'utf8')) as Snapshot;
const urls = [...new Set(snapshot.rows.map((r) => r.sourceUrl))];
const broken: string[] = [];
const warnings: string[] = [];

for (const url of urls) {
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { redirect: 'follow' });
    if (res.status === 404 || res.status === 410) broken.push(`${res.status} ${url}`);
    else if (!res.ok) warnings.push(`${res.status} ${url}`);
  } catch (e) {
    warnings.push(`${(e as Error).message} ${url}`);
  }
}

console.log(`Перевірено посилань: ${urls.length}`);
for (const w of warnings) console.warn(`ПОПЕРЕДЖЕННЯ: ${w}`);
for (const b of broken) console.error(`БИТЕ: ${b}`);
process.exit(broken.length > 0 ? 1 : 0);
