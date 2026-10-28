import { useRef, useState, type FormEvent } from 'react';
import { clearCart, getCart } from '../lib/cart';
import type { SiteConfig } from '../lib/config';
import { t } from '../lib/i18n';
import { setLastOrder } from '../lib/lastOrder';
import { announce } from '../lib/live';
import { isOrderingOpen, orderWindowState, type OrderWindow } from '../lib/orderWindow';
import { getOrderWindowToday, recheckOrderWindow, useOrderWindowToday } from '../lib/orderWindowClock';
import { createOrderId } from '../lib/orderId';
import { clearPendingOrder, countSent, getPendingOrder, markLineSent, partialStatus, startPendingOrder, usePartialOrder } from '../lib/pendingOrder';
import type { OrderTotals, PricedLine } from '../lib/pricing';
import { navigate } from '../lib/route';
import { buildCopyText, isValidPhone, sendOrder, validateForm, type ContactForm } from '../lib/submit';
import { ULADS } from '../lib/types';
import { orderWindowText } from '../lib/ui';

type Field = keyof ContactForm;
type TextKey = 'firstName' | 'lastName' | 'station' | 'childFirstName' | 'childLastName';

interface TextFieldProps {
  name: TextKey;
  label: string;
  value: string;
  error: string | null;
  disabled: boolean;
  describedBy?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

function TextField({ name, label, value, error, disabled, describedBy, autoComplete, onChange, onBlur }: TextFieldProps) {
  const errorId = `f-${name}-e`;
  const described = [describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <input
        id={`f-${name}`}
        className="input"
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error !== null}
        aria-describedby={described}
      />
      {error !== null && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}

interface Props {
  config: SiteConfig;
  orderWindow: OrderWindow;
  lines: PricedLine[];
  totals: OrderTotals;
}

export function OrderForm({ config, orderWindow, lines, totals }: Props) {
  const [form, setForm] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    phone: '',
    station: config.station,
    uladh: '',
    unit: '',
    consent: false,
    childFirstName: '',
    childLastName: '',
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const sendingRef = useRef(false);
  const partial = usePartialOrder();
  const today = useOrderWindowToday();
  const state = orderWindowState(orderWindow, today);
  const windowBlocked = !isOrderingOpen(state) && partial === null;
  const reason = windowBlocked ? orderWindowText(state) : null;

  const errors = validateForm(form);
  const valid = Object.keys(errors).length === 0;
  const shown = (k: Field) => Boolean(errors[k]) && (touched[k] || tried);
  const locked = partial !== null && sessionStarted;
  const personName = `${form.lastName} ${form.firstName}`;

  const message: Record<string, string> = {
    firstName: t('form.error.firstName'),
    lastName: t('form.error.lastName'),
    phone: form.phone.trim() ? t('form.error.phoneInvalid') : t('form.error.phoneMissing'),
    station: t('form.error.station'),
    uladh: t('form.error.uladh'),
    consent: t('form.error.consent'),
    childFirstName: t('form.error.childFirstName'),
    childLastName: t('form.error.childLastName'),
  };

  function set<K extends Field>(key: K, value: ContactForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  const touch = (k: Field) => () => setTouched((x) => ({ ...x, [k]: true }));
  const text = (name: TextKey, label: string, describedBy?: string, autoComplete?: string) => ({
    name,
    label,
    value: form[name],
    error: shown(name) ? message[name] : null,
    disabled: locked,
    describedBy,
    autoComplete,
    onChange: (value: string) => set(name, value),
    onBlur: touch(name),
  });

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!sendingRef.current) {
      recheckOrderWindow();
      const now = orderWindowState(orderWindow, getOrderWindowToday());
      if (!isOrderingOpen(now) && partialStatus(getCart(), getPendingOrder()) === null) {
        announce(orderWindowText(now) ?? '');
        return;
      }
    }
    if (!valid || sendingRef.current) {
      setTried(true);
      announce(t('live.checkFields'));
      return;
    }
    sendingRef.current = true;
    const orderId = getPendingOrder()?.orderId ?? createOrderId();
    startPendingOrder(orderId);
    setSessionStarted(true);
    setSending(true);
    setProgress(countSent(getCart(), getPendingOrder()));
    setFailed(false);
    announce(t('live.sending'));
    try {
      const result = await sendOrder(config, form, lines, {
        orderId,
        isSent: (sku) => getPendingOrder()?.sentSkus.includes(sku) ?? false,
        onSent: markLineSent,
        onProgress: setProgress,
      });
      if (result.ok) {
        setLastOrder({ count: totals.lines, units: totals.units, orderId, total: totals.total, name: personName.trim(), phone: form.phone.trim() });
        clearPendingOrder();
        clearCart();
        announce(t('live.sent'));
        navigate('/thanks');
      } else {
        setFailed(true);
        announce(t('live.failed'));
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function copyOrder() {
    try {
      await navigator.clipboard.writeText(buildCopyText(lines, totals, form, getPendingOrder()?.orderId ?? null));
    } catch {
      /* ignore */
    }
    setCopied(true);
    announce(t('live.copied'));
    setTimeout(() => setCopied(false), 2000);
  }

  const pending = getPendingOrder();
  const off = !valid || sending || windowBlocked;
  const showHint = !sending && (reason !== null || !valid);
  const showAlert = !sending && (failed || partial !== null);

  return (
    <form className="panel form" onSubmit={onSubmit} noValidate aria-labelledby="form-h">
      <h2 id="form-h" className="panel__title">
        {t('form.title')}
      </h2>
      <div className="pair">
        <TextField {...text('firstName', t('form.firstName'), undefined, 'given-name')} />
        <TextField {...text('lastName', t('form.lastName'), undefined, 'family-name')} />
      </div>

      <div className="pair">
        <TextField {...text('childFirstName', t('form.childFirstName'), 'f-child-hint')} />
        <TextField {...text('childLastName', t('form.childLastName'), 'f-child-hint')} />
      </div>
      <span id="f-child-hint" className="hint hint--left">
        {t('form.childHint')}
      </span>

      <div className="field">
        <label htmlFor="f-phone">{t('form.phone')}</label>
        <input
          id="f-phone"
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={t('form.phonePlaceholder')}
          value={form.phone}
          disabled={locked}
          onChange={(e) => set('phone', e.target.value)}
          onBlur={touch('phone')}
          aria-invalid={shown('phone')}
          aria-describedby={shown('phone') ? 'f-phone-e' : undefined}
        />
        {shown('phone') && (
          <span id="f-phone-e" className="field__error">
            {form.phone.trim() && !isValidPhone(form.phone) ? t('form.error.phoneInvalid') : message.phone}
          </span>
        )}
      </div>

      <div className="pair">
        <TextField {...text('station', t('form.station'))} />
        <div className="field">
          <label htmlFor="f-uladh">{t('form.uladh')}</label>
          <select id="f-uladh" className="input" value={form.uladh} disabled={locked} onChange={(e) => set('uladh', e.target.value)} onBlur={touch('uladh')} aria-invalid={shown('uladh')}>
            <option value="">{t('form.uladhPlaceholder')}</option>
            {ULADS.map((u) => (
              <option key={u} value={u}>
                {t(`uladh.${u}`)}
              </option>
            ))}
          </select>
          {shown('uladh') && <span className="field__error">{message.uladh}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="f-unit">
          {t('form.unit')} <span className="muted">{t('form.optional')}</span>
        </label>
        <input id="f-unit" className="input" placeholder={t('form.unitPlaceholder')} value={form.unit} disabled={locked} onChange={(e) => set('unit', e.target.value)} />
      </div>

      <div className="field">
        <label className="check">
          <input
            type="checkbox"
            checked={form.consent}
            disabled={locked}
            onChange={(e) => {
              set('consent', e.target.checked);
              touch('consent')();
            }}
            aria-invalid={shown('consent')}
          />
          <span>
            {t('form.consent')} <a href="#/datenschutz">{t('form.consentLink')}</a>
          </span>
        </label>
        {shown('consent') && <span className="field__error field__error--indent">{message.consent}</span>}
      </div>

      {showAlert && pending && (
        <div role="alert" className="alert">
          <div>
            <strong className="alert__title">{t('form.sendError.title')}</strong>{' '}
            {t('form.partialError', { sent: countSent(getCart(), pending), total: lines.length, id: pending.orderId })}
          </div>
          <div className="row row--sm">
            <button
              type="submit"
              className={`btn btn--danger${windowBlocked ? ' is-off' : ''}`}
              aria-disabled={windowBlocked ? true : undefined}
              aria-describedby={windowBlocked ? 'f-submit-hint' : undefined}
            >
              {t('form.sendError.retry')}
            </button>
            <button type="button" className="btn btn--outline" onClick={() => void copyOrder()}>
              {copied ? t('pay.copied') : t('form.copyOrder')}
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        className={`btn btn--primary btn--xl${off ? ' is-off' : ''}`}
        aria-disabled={off}
        aria-describedby={showHint ? 'f-submit-hint' : undefined}
      >
        {sending ? t('form.sendingProgress', { sent: progress, total: lines.length }) : t('form.submit')}
      </button>
      {showHint && (
        <span id="f-submit-hint" className="hint">
          {reason ?? t('form.hint')}
        </span>
      )}
    </form>
  );
}
