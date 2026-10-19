import type { SiteConfig } from '../lib/config';
import { t } from '../lib/i18n';
import { getLastOrder } from '../lib/lastOrder';
import { formatPrice, itemsWord } from '../lib/ui';
import { PaymentDetails } from './PaymentDetails';

export function ThanksPage({ config }: { config: SiteConfig }) {
  const last = getLastOrder();
  return (
    <div className="stack narrow">
      <div className="stack stack--xs thanks">
        <span aria-hidden="true" className="thanks__icon">
          ✓
        </span>
        <h1 className="h1">{t('thanks.title')}</h1>
        <p className="muted-text">
          {last
            ? t('thanks.summary', { id: last.orderId, count: last.count, unit: itemsWord(last.count), units: last.units, phone: last.phone })
            : t('thanks.summaryDefault')}
        </p>
        {last?.total != null && (
          <p>
            <strong>{t('cart.total', { total: formatPrice(last.total) })}</strong>
          </p>
        )}
      </div>
      <section className="panel">
        <h2 className="panel__title">{t('thanks.nextTitle')}</h2>
        <p>{t('thanks.nextText')}</p>
      </section>
      <PaymentDetails variant="thanks" config={config} />
      <a className="btn btn--primary btn--xl" href="#/">
        {t('thanks.back')}
      </a>
    </div>
  );
}
