import type { SiteConfig } from './config';
import { t } from './i18n';
import { formatSumField, type OrderTotals, type PricedLine } from './pricing';
import { formatPrice, itemsWord } from './ui';

export interface ContactForm {
  firstName: string;
  lastName: string;
  phone: string;
  station: string;
  uladh: string;
  unit: string;
  consent: boolean;
  childFirstName: string;
  childLastName: string;
}

/** Текст замовлення з контактами для ручного копіювання (запасний сценарій). */
export function buildCopyText(lines: PricedLine[], totals: OrderTotals, form: ContactForm, orderId: string | null): string {
  const rows = lines.map((l) => {
    const params = { sku: l.item.sku, size: l.item.size, name: l.name, quantity: l.item.quantity };
    return l.price === null || l.lineTotal === null
      ? t('copy.lineUnpriced', params)
      : t('copy.line', { ...params, price: formatPrice(l.price), lineTotal: formatPrice(l.lineTotal) });
  });
  if (totals.total !== null) {
    const total = formatPrice(totals.total);
    rows.push(
      totals.unpriced > 0 ? t('copy.totalUnpriced', { total, count: totals.unpriced, unit: itemsWord(totals.unpriced) }) : t('copy.total', { total }),
    );
  }
  const childFirst = form.childFirstName.trim();
  const childLast = form.childLastName.trim();
  if (childFirst) rows.push(t('copy.childFirstName', { value: childFirst }));
  if (childLast) rows.push(t('copy.childLastName', { value: childLast }));
  const header = orderId ? t('copy.header', { id: orderId }) : t('form.orderHeader');
  const person = `${form.lastName} ${form.firstName}`.trim();
  const place = [form.station, form.uladh, form.unit].filter((v) => v.trim()).join(', ');
  return `${header}\n${rows.join('\n')}\n\n${person}, ${form.phone}\n${place}`;
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
  if (!form.childFirstName.trim()) errors.childFirstName = true;
  if (!form.childLastName.trim()) errors.childLastName = true;
  return errors;
}

/** Тіло запиту для однієї позиції; «Сума» — ціна × кількість цієї позиції (порожньо, якщо ціни немає). */
export function buildLinePayload(config: SiteConfig, form: ContactForm, line: PricedLine, orderId: string): URLSearchParams {
  const f = config.form.fields;
  const body = new URLSearchParams();
  body.set(f.firstName, form.firstName.trim());
  body.set(f.lastName, form.lastName.trim());
  body.set(f.phone, form.phone.trim());
  body.set(f.station, form.station.trim());
  body.set(f.uladh, form.uladh);
  if (form.unit.trim()) body.set(f.unit, form.unit.trim());
  body.set(f.consent, config.form.consentValue);
  body.set(f.orderId, orderId);
  body.set(f.sku, line.item.sku);
  body.set(f.itemName, line.name);
  body.set(f.size, line.item.size);
  body.set(f.quantity, String(line.item.quantity));
  body.set(f.childFirstName, form.childFirstName.trim());
  body.set(f.childLastName, form.childLastName.trim());
  if (line.lineTotal !== null && f.total) body.set(f.total, formatSumField(line.lineTotal));
  return body;
}

export const SEND_TIMEOUT_MS = 15_000;

/**
 * Надсилає один рядок POST-запитом на formResponse у режимі no-cors:
 * відповіді не видно, тож успіхом вважається будь-який запит без мережевої помилки.
 * Запит, що не завершився за timeoutMs, вважається невдалим.
 */
export function postLine(config: SiteConfig, body: URLSearchParams, timeoutMs: number): Promise<void> {
  if (!config.form.action) {
    if (import.meta.env.DEV) return Promise.resolve();
    return Promise.reject(new Error('form.action не налаштовано'));
  }
  const action = config.form.action;
  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);
    fetch(action, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    })
      .then(() => resolve(), reject)
      .finally(() => clearTimeout(timer));
  });
}

export interface SendOptions {
  orderId: string;
  isSent: (sku: string) => boolean;
  onSent: (sku: string) => void;
  onProgress: (sent: number) => void;
  timeoutMs?: number;
}

export type SendResult = { ok: true } | { ok: false; sent: number };

/** Надсилає непідтверджені позиції по черзі; зупиняється на першій невдалій. */
export async function sendOrder(config: SiteConfig, form: ContactForm, lines: PricedLine[], opts: SendOptions): Promise<SendResult> {
  let sent = lines.filter((l) => opts.isSent(l.item.sku)).length;
  for (const line of lines) {
    if (opts.isSent(line.item.sku)) continue;
    const body = buildLinePayload(config, form, line, opts.orderId);
    try {
      await postLine(config, body, opts.timeoutMs ?? SEND_TIMEOUT_MS);
    } catch {
      return { ok: false, sent };
    }
    sent += 1;
    opts.onSent(line.item.sku);
    opts.onProgress(sent);
  }
  return { ok: true };
}
