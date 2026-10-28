import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repo = resolve('.');
let tmp = '';

function setup(extraSettings: string): void {
  tmp = mkdtempSync(join(tmpdir(), 'fetch-catalog-'));
  mkdirSync(join(tmp, 'public', 'sample'), { recursive: true });
  copyFileSync(join(repo, 'config.example.json'), join(tmp, 'public', 'config.json'));
  for (const f of ['catalog.csv', 'synonyms.csv']) copyFileSync(join(repo, 'public/sample', f), join(tmp, 'public/sample', f));
  const settings = readFileSync(join(repo, 'public/sample/settings.csv'), 'utf8').trimEnd();
  writeFileSync(join(tmp, 'public/sample/settings.csv'), `${settings}\n${extraSettings}\n`);
}

function run(...args: string[]) {
  return spawnSync(join(repo, 'node_modules/.bin/tsx'), [join(repo, 'scripts/fetch-catalog.ts'), ...args], { cwd: tmp, encoding: 'utf8' });
}

afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
  tmp = '';
});

describe('SPEC-2026-10-28-ordering-window', () => {
  it('AC-23: --strict завершується з кодом 1 і називає ключ та значення', () => {
    setup('order_close,2026-11-1x');
    const res = run('--strict');
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('order_close');
    expect(res.stderr).toContain('2026-11-1x');
  });

  it('AC-24: звичайний запуск завершується з кодом 0 і зберігає сире значення у знімку', () => {
    setup('order_close,2026-11-1x');
    const res = run();
    expect(res.status).toBe(0);
    const snapshot = JSON.parse(readFileSync(join(tmp, 'public/catalog.json'), 'utf8'));
    expect(snapshot.settings.order_close).toBe('2026-11-1x');
  });

  it('коректне вікно не заважає --strict', () => {
    setup('order_open,2026-11-01\norder_close,15.11.2026');
    expect(run('--strict').status).toBe(0);
  });
});
