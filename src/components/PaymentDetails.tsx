import type { SiteConfig } from '../lib/config';
import { t } from '../lib/i18n';

export type PaymentVariant = 'cart' | 'thanks' | 'faq';

export function PaymentDetails({ variant, config }: { variant: PaymentVariant; config: SiteConfig | null }) {
  const title = variant === 'faq' ? t('pay.titleFaq') : t('pay.title');
  const intro = variant === 'cart' ? t('pay.introCart') : variant === 'thanks' ? t('pay.introThanks') : t('pay.introFaq');
  const coordinators = variant === 'faq' ? [] : (config?.coordinators ?? []);

  return (
    <section aria-labelledby={`pay-${variant}`} className="panel">
      <h2 id={`pay-${variant}`} className="panel__title">
        {title}
      </h2>
      <p className="muted-text">{intro}</p>
      {coordinators.map((c) => (
        <p key={c.name + c.phone}>
          {t('pay.coordinator')}: <strong>{c.name}</strong>, <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
        </p>
      ))}
    </section>
  );
}
