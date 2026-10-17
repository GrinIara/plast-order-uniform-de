import { useState } from 'react';
import { t } from '../lib/i18n';
import { announce } from '../lib/live';
import type { Settings } from '../lib/types';

export type PaymentVariant = 'cart' | 'thanks' | 'faq';

function useCopy() {
  const [copied, setCopied] = useState('');
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* буфер обміну недоступний: текст можна виділити вручну */
    }
    setCopied(key);
    announce(t('live.copied'));
    setTimeout(() => setCopied(''), 2000);
  }
  return { copied, copy };
}

export function paymentPurpose(settings: Settings, personName: string): string {
  const prefix = settings.purpose_hint || t('pay.purposeDefaultPrefix');
  return t('pay.purposeValue', { prefix, name: personName.trim() || t('pay.purposeName') });
}

interface Props {
  settings: Settings;
  variant: PaymentVariant;
  /** «Прізвище Ім'я» для призначення платежу. */
  personName?: string;
}

export function PaymentDetails({ settings, variant, personName = '' }: Props) {
  const { copied, copy } = useCopy();
  const purpose = paymentPurpose(settings, personName);
  const hasDetails = Boolean(settings.recipient || settings.iban);
  const title = variant === 'faq' ? t('pay.titleFaq') : t('pay.title');
  const intro = variant === 'cart' ? t('pay.introCart') : variant === 'thanks' ? t('pay.introThanks') : null;
  const note = settings.payment_note;

  return (
    <section aria-labelledby={`pay-${variant}`} className="panel">
      <h2 id={`pay-${variant}`} className="panel__title">
        {title}
      </h2>
      {intro && <p className="muted-text">{intro}</p>}
      {!hasDetails ? (
        <p>{t('pay.unavailable')}</p>
      ) : (
        <>
          <dl className="pay">
            <dt>{t('pay.recipient')}</dt>
            <dd>{settings.recipient}</dd>
            <dt>{t('pay.iban')}</dt>
            <dd className="pay__iban">{settings.iban}</dd>
            {settings.bic && (
              <>
                <dt>{t('pay.bic')}</dt>
                <dd className="pay__num">{settings.bic}</dd>
              </>
            )}
            <dt>{t('pay.purpose')}</dt>
            <dd>{purpose}</dd>
          </dl>
          <div className="row row--sm">
            <button type="button" className="btn btn--outline" onClick={() => void copy((settings.iban ?? '').replace(/\s+/g, ''), 'iban')}>
              {copied === 'iban' ? t('pay.copied') : t('pay.copyIban')}
            </button>
            {variant !== 'faq' && (
              <button type="button" className="btn btn--outline" onClick={() => void copy(purpose, 'purpose')}>
                {copied === 'purpose' ? t('pay.copied') : t('pay.copyPurpose')}
              </button>
            )}
          </div>
        </>
      )}
      {note && variant !== 'cart' && <p className="muted-text">{note}</p>}
    </section>
  );
}
