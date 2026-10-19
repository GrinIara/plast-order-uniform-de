import { removeFromCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { announce } from '../lib/live';
import type { OrderTotals, PricedLine } from '../lib/pricing';
import { formatPrice, itemsWord } from '../lib/ui';
import { QuantityCounter } from './QuantityCounter';

interface Props {
  lines: PricedLine[];
  totals: OrderTotals;
  locked: boolean;
}

export function CartLines({ lines, totals, locked }: Props) {
  function remove(sku: string, name: string) {
    removeFromCart(sku);
    announce(t('live.removed', { name }));
  }

  return (
    <section aria-label={t('cart.itemsLabel')} className="panel panel--flush">
      <div className="panel__head">{t('cart.count', { count: totals.lines, units: totals.units })}</div>
      <ul className="cartlist">
        {lines.map(({ item, name, stock, price, lineTotal }) => (
          <li key={item.sku} className="cartlist__item">
            <div className="cartlist__main">
              <div className="cartlist__name">{name}</div>
              <div className="muted-text">{t('cart.itemMeta', { size: item.size, sku: item.sku })}</div>
              {stock !== 'in' && <div className="badge">{t('cart.statusNote', { status: stock === 'none' ? t('cart.statusNone') : t('cart.statusOrder') })}</div>}
              <div className="cartlist__price">
                {price !== null && lineTotal !== null
                  ? t('cart.lineTotal', { price: formatPrice(price), quantity: item.quantity, lineTotal: formatPrice(lineTotal) })
                  : t('cart.priceUnknown')}
              </div>
            </div>
            <QuantityCounter sku={item.sku} name={name} size={item.size} quantity={item.quantity} disabled={locked} />
            <button
              type="button"
              className="btn btn--outline btn--danger-hover"
              aria-label={t('cart.removeAria', { name, size: item.size })}
              disabled={locked}
              onClick={() => remove(item.sku, name)}
            >
              {t('card.remove')}
            </button>
          </li>
        ))}
      </ul>
      <div className="panel__foot">
        {totals.total !== null ? (
          <>
            <strong>{t('cart.total', { total: formatPrice(totals.total) })}</strong>
            {totals.unpriced > 0 && <div>{t('cart.unpricedNote', { count: totals.unpriced, unit: itemsWord(totals.unpriced) })}</div>}
          </>
        ) : (
          t('cart.allUnpriced')
        )}
      </div>
    </section>
  );
}
