import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'node:fs';

function readBasePath(): string {
  const raw = process.env.SITE_CONFIG ?? (existsSync('public/config.json') ? readFileSync('public/config.json', 'utf8') : '');
  if (!raw) return '/';
  try {
    const base = (JSON.parse(raw) as { basePath?: string }).basePath ?? '/';
    return base.endsWith('/') ? base : `${base}/`;
  } catch {
    return '/';
  }
}

export default defineConfig({
  base: readBasePath(),
  plugins: [react()],
  test: { environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
});
