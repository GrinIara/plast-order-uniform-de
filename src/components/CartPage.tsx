import { useState, type FormEvent } from 'react';
import { clearCart, removeFromCart, useCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { setLastOrder } from '../lib/lastOrder';
import { announce } from '../lib/live';
import { navigate } from '../lib/route';
import { buildCopyText, isValidPhone, submitOrder, validateForm, type ContactForm } from '../lib/submit';
import { ULADS } from '../lib/types';
import type { SiteConfig } from '../lib/config';
import type { LoadedCatalog } from '../lib/data';
import { PaymentDetails } from './PaymentDetails';

type Field = keyof ContactForm;

export function CartPage({ config, catalog }: { config: SiteConfig; catalog: LoadedCatalog }) {
  const items = useCart();
  const [form, setForm] = useState<ContactForm>({ firstName: '', lastName: '', phone: '', station: config.station, uladh: '', unit: '', consent: false });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const errors = validateForm(form);
  const valid = Object.keys(errors).length === 0;
  const shown = (k: Field) => Boolean(errors[k]) && (touched[k] || tried);
  const personName = `${form.lastName} ${form.firstName}`;

  const message: Record<string, string> = {
    firstName: t('form.error.firstName'),
    lastName: t('form.error.lastName'),
    phone: form.phone.trim() ? t('form.error.phoneInvalid') : t('form.error.phoneMissing'),
    station: t('form.error.station'),
    uladh: t('form.error.uladh'),
    consent: t('form.error.consent'),
  };

  function set<K extends Field>(key: K, value: ContactForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  const touch = (k: Field) => () => setTouched((x) => ({ ...x, [k]: true }));

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!valid || sending) {
      setTried(true);
      announce(t('live.checkFields'));
      return;
    }
    setSending(true);
    setFailed(false);
    announce(t('live.sending'));
    try {
      await submitOrder(config, form, items);
      setLastOrder({ count: items.length, name: personName.trim(), phone: form.phone.trim() });
      clearCart();
      announce(t('live.sent'));
      navigate('/thanks');
    } catch {
      setFailed(true);
      announce(t('live.failed'));
    } finally {
      setSending(false);
    }
  }

  async function copyOrder() {
    try {
      await navigator.clipboard.writeText(buildCopyText(items, form));
    } catch {
      /* ignore */
    }
    setCopied(true);
    announce(t('live.copied'));
    setTimeout(() => setCopied(false), 2000);
  }

  function remove(sku: string, name: string) {
    removeFromCart(sku);
    announce(t('live.removed', { name }));
  }

  const head = (
    <div>
      <a className="backlink" href="#/">
        {t('app.back')}
      </a>
      <h1 className="h1">{t('cart.title')}</h1>
      <div lang="de" className="muted-text">
        {t('cart.summary')}
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="stack">
        {head}
        <div className="panel panel--start">
          <h2 className="panel__title">{t('cart.empty.title')}</h2>
          <p className="muted-text">{t('cart.empty.text')}</p>
          <a className="btn btn--primary btn--lg" href="#/">
            {t('cart.empty.action')}
          </a>
        </div>
      </div>
    );
  }

  const textField = (key: 'firstName' | 'lastName' | 'station', label: string, autoComplete?: string) => (
    <div className="field">
      <label htmlFor={`f-${key}`}>{label}</label>
      <input
        id={`f-${key}`}
        className="input"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        onBlur={touch(key)}
        aria-invalid={shown(key)}
        aria-describedby={shown(key) ? `f-${key}-e` : undefined}
      />
      {shown(key) && (
        <span id={`f-${key}-e`} className="field__error">
          {message[key]}
        </span>
      )}
    </div>
  );

  return (
    <div className="stack">
      {head}
      <div className="cols">
        <div className="stack">
          <section aria-label={t('cart.itemsLabel')} className="panel panel--flush">
            <div className="panel__head">{t('cart.count', { count: items.length })}</div>
            <ul className="cartlist">
              {items.map((it) => {
                const product = catalog.products.find((p) => p.productId === it.productId);
                const variant = product?.variants.find((v) => v.sku === it.sku);
                const name = product?.nameUk ?? it.name;
                const stock = variant?.stock ?? it.stock;
                return (
                  <li key={it.sku} className="cartlist__item">
                    <div className="cartlist__main">
                      <div className="cartlist__name">{name}</div>
                      <div className="muted-text">{t('cart.itemMeta', { size: it.size, sku: it.sku })}</div>
                      {stock !== 'in' && <div className="badge">{t('cart.statusNote', { status: stock === 'none' ? t('cart.statusNone') : t('cart.statusOrder') })}</div>}
                    </div>
                    <button type="button" className="btn btn--outline btn--danger-hover" aria-label={t('cart.removeAria', { name, size: it.size })} onClick={() => remove(it.sku, name)}>
                      {t('card.remove')}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="panel__foot">{t('cart.noAmount')}</div>
          </section>

          <PaymentDetails variant="cart" config={config} />
        </div>

        <form className="panel form" onSubmit={onSubmit} noValidate aria-labelledby="form-h">
          <h2 id="form-h" className="panel__title">
            {t('form.title')}
          </h2>
          <div className="pair">
            {textField('firstName', t('form.firstName'), 'given-name')}
            {textField('lastName', t('form.lastName'), 'family-name')}
          </div>

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
            {textField('station', t('form.station'))}
            <div className="field">
              <label htmlFor="f-uladh">{t('form.uladh')}</label>
              <select id="f-uladh" className="input" value={form.uladh} onChange={(e) => set('uladh', e.target.value)} onBlur={touch('uladh')} aria-invalid={shown('uladh')}>
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
            <input id="f-unit" className="input" placeholder={t('form.unitPlaceholder')} value={form.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>

          <div className="field">
            <label className="check">
              <input
                type="checkbox"
                checked={form.consent}
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

          {failed && (
            <div role="alert" className="alert">
              <div>
                <strong className="alert__title">{t('form.sendError.title')}</strong> {t('form.sendError.text')}
              </div>
              <div className="row row--sm">
                <button type="submit" className="btn btn--danger">
                  {t('form.sendError.retry')}
                </button>
                <button type="button" className="btn btn--outline" onClick={() => void copyOrder()}>
                  {copied ? t('pay.copied') : t('form.copyOrder')}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className={`btn btn--primary btn--xl${valid && !sending ? '' : ' is-off'}`} aria-disabled={!valid || sending}>
            {sending ? t('form.sending') : t('form.submit')}
          </button>
          {!valid && !sending && <span className="hint">{t('form.hint')}</span>}
        </form>
      </div>
    </div>
  );
}
