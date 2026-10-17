import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { configSchema } from '../src/lib/config';

/**
 * Записує public/config.json зі змінної SITE_CONFIG (GitHub Actions Variable) або .env.
 * Без неї: у розробці береться config.example.json; REQUIRE_CONFIG=1 (деплой) вимагає справжнього значення.
 */
function fromDotEnv(): string | undefined {
  if (!existsSync('.env')) return undefined;
  const line = readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('SITE_CONFIG='));
  return line?.slice('SITE_CONFIG='.length);
}

let raw = process.env.SITE_CONFIG || fromDotEnv();
if (!raw) {
  if (process.env.REQUIRE_CONFIG === '1') {
    console.error('SITE_CONFIG не задано. Додайте Variable SITE_CONFIG (Settings → Secrets and variables → Actions → Variables).');
    process.exit(1);
  }
  console.warn('SITE_CONFIG не задано: використовується config.example.json (зразкові дані).');
  raw = readFileSync('config.example.json', 'utf8');
}

const parsed = configSchema.safeParse(JSON.parse(raw));
if (!parsed.success) {
  console.error('SITE_CONFIG не відповідає схемі:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/config.json', JSON.stringify(parsed.data, null, 2));
console.log('public/config.json записано');
