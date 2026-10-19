import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/lib/config';
import example from '../config.example.json';

const REQUIRED = ['orderId', 'sku', 'itemName', 'size', 'quantity', 'childFirstName', 'childLastName'] as const;

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-55: збірка падає й називає кожен відсутній ключ form.fields', () => {
    const fields: Record<string, string> = { ...example.form.fields };
    for (const key of REQUIRED) delete fields[key];
    const config = { ...example, form: { ...example.form, fields } };
    const res = spawnSync('node_modules/.bin/tsx', ['scripts/write-config.ts'], {
      env: { ...process.env, SITE_CONFIG: JSON.stringify(config), REQUIRE_CONFIG: '' },
      encoding: 'utf8',
    });
    expect(res.status).not.toBe(0);
    for (const key of REQUIRED) expect(res.stderr).toContain(`form.fields.${key}: Required`);
  });

  it('AC-56: застаріла конфігурація з «order» і без «total» валідна', () => {
    const fields: Record<string, string> = { ...example.form.fields };
    delete fields.total;
    expect(configSchema.safeParse({ ...example, form: { ...example.form, fields } }).success).toBe(true);
    expect(configSchema.safeParse(example).success).toBe(true);
    expect(example.form.fields.order).toBeTruthy();
  });
});
