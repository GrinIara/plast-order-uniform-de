import type { SiteConfig } from './config';
import { t } from './i18n';
import type { CartItem } from './types';

export interface ContactForm {
  firstName: string;
  lastName: string;
  phone: string;
  station: string;
  uladh: string;
  unit: string;
  consent: boolean;
}

/** Один рядок на позицію: `SKU / розмір — назва`. */
export function buildOrderText(items: CartItem[]): string {
  return items.map((i) => `${i.sku} / ${i.size} — ${i.name}`).join('\n');
}

/** Текст замовлення з контактами для ручного копіювання (запасний сценарій). */
export function buildCopyText(items: CartItem[], form: ContactForm): string {
  const person = `${form.lastName} ${form.firstName}`.trim();
  const place = [form.station, form.uladh, form.unit].filter((v) => v.trim()).join(', ');
  return `${t('form.orderHeader')}\n${items.map((i) => `${i.sku} / ${i.size}`).join('\n')}\n\n${person}, ${form.phone}\n${place}`;
}

const PHONE_RE = /^\+?[0-9 ()./-]{7,24}$/;

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  return PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 7;
}

export type FormErrors = Partial<Record<keyof ContactForm, true>>;

export function validateForm(form: ContactForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = true;
  if (!form.lastName.trim()) errors.lastName = true;
  if (!isValidPhone(form.phone)) errors.phone = true;
  if (!form.station.trim()) errors.station = true;
  if (!form.uladh) errors.uladh = true;
  if (!form.consent) errors.consent = true;
  return errors;
}

export function buildPayload(config: SiteConfig, form: ContactForm, items: CartItem[]): URLSearchParams {
  const f = config.form.fields;
  const body = new URLSearchParams();
  body.set(f.firstName, form.firstName.trim());
  body.set(f.lastName, form.lastName.trim());
  body.set(f.phone, form.phone.trim());
  body.set(f.station, form.station.trim());
  body.set(f.uladh, form.uladh);
  if (form.unit.trim()) body.set(f.unit, form.unit.trim());
  body.set(f.order, buildOrderText(items));
  body.set(f.consent, config.form.consentValue);
  return body;
}

/**
 * Надсилає замовлення POST-запитом на formResponse у режимі no-cors:
 * відповіді не видно, тож успіхом вважається будь-який запит без мережевої помилки.
 */
export async function submitOrder(config: SiteConfig, form: ContactForm, items: CartItem[]): Promise<void> {
  if (!config.form.action) {
    if (import.meta.env.DEV) return;
    throw new Error('form.action не налаштовано');
  }
  await fetch(config.form.action, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildPayload(config, form, items),
  });
}
