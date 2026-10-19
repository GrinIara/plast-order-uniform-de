import { useCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { usePartialOrder } from '../lib/pendingOrder';
import { orderTotals, resolveLines } from '../lib/pricing';
import type { SiteConfig } from '../lib/config';
import type { LoadedCatalog } from '../lib/data';
import { CartLines } from './CartLines';
import { OrderForm } from './OrderForm';
import { PaymentDetails } from './PaymentDetails';

export function CartPage({ config, catalog }: { config: SiteConfig; catalog: LoadedCatalog }) {
  const items = useCart();
  const lines = resolveLines(items, catalog.products);
  const totals = orderTotals(lines);
  const partial = usePartialOrder();

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

  return (
    <div className="stack">
      {head}
      <div className="cols">
        <div className="stack">
          <CartLines lines={lines} totals={totals} locked={partial !== null} />

          <PaymentDetails variant="cart" config={config} total={totals.total} />
        </div>

        <OrderForm config={config} lines={lines} totals={totals} />
      </div>
    </div>
  );
}
