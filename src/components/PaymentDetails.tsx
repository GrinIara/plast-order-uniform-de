import type { SiteConfig } from '../lib/config';
import { t } from '../lib/i18n';
import { formatPrice } from '../lib/ui';

export type PaymentVariant = 'cart' | 'thanks';

export function PaymentDetails({ variant, config, total }: { variant: PaymentVariant; config: SiteConfig | null; total?: number | null }) {
  const intro = variant === 'cart' ? t('pay.introCart') : t('pay.introThanks');
  const coordinators = config?.coordinators ?? [];

  return (
    <section aria-labelledby={`pay-${variant}`} className="panel">
      <h2 id={`pay-${variant}`} className="panel__title">
        {t('pay.title')}
      </h2>
      <p className="muted-text">{intro}</p>
      {typeof total === 'number' && (
        <p>
          <strong>{t('cart.total', { total: formatPrice(total) })}</strong>
        </p>
      )}
      {coordinators.map((c) => (
        <p key={c.name + c.phone}>
          {t('pay.coordinator')}: <strong>{c.name}</strong>, <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>
        </p>
      ))}
    </section>
  );
}
