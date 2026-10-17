import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Падає, якщо в компонентах знайдено кирилицю поза коментарями: тексти мають лежати в src/i18n/uk.json. */
const DIR = 'src/components';
const CYRILLIC = /[Ѐ-ӿ]/;
let failed = false;

for (const file of readdirSync(DIR).filter((f) => /\.tsx?$/.test(f))) {
  const source = readFileSync(join(DIR, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  source.split('\n').forEach((line, i) => {
    if (CYRILLIC.test(line)) {
      failed = true;
      console.error(`${DIR}/${file}:${i + 1}: захардкоджений текст: ${line.trim()}`);
    }
  });
}

if (failed) process.exit(1);
console.log('i18n: у компонентах немає захардкоджених текстів');
