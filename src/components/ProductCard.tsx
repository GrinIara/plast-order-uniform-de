import { useState } from 'react';
import { addToCart, removeFromCart, useCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { announce } from '../lib/live';
import { usePartialOrder } from '../lib/pendingOrder';
import { categoryMark, formatDate, formatPrice } from '../lib/ui';
import type { Product } from '../lib/types';
import { QuantityCounter } from './QuantityCounter';

export function ProductCard({ product, tint }: { product: Product; tint: string }) {
  const cart = useCart();
  const [picked, setPicked] = useState<string | null>(null);
  const selectedSku = picked ?? (product.variants.length === 1 ? product.variants[0].sku : null);
  const selected = product.variants.find((v) => v.sku === selectedSku);
  const line = selected ? cart.find((i) => i.sku === selected.sku) : undefined;
  const locked = usePartialOrder() !== null;
  const url = product.variants[0].sourceUrl;
  const shownVariant = selected ?? product.variants.find((v) => v.price !== null);

  function add() {
    if (!selected) {
      announce(t('live.pickFirst'));
      return;
    }
    addToCart({ sku: selected.sku, productId: product.productId, name: product.nameUk, size: selected.size, stock: selected.stock });
    announce(t('live.added', { name: product.nameUk, size: selected.size }));
  }

  function remove() {
    if (!selected) return;
    removeFromCart(selected.sku);
    announce(t('live.removed', { name: product.nameUk }));
  }

  return (
    <article className="card">
      <div className="card__photo" style={{ background: tint }}>
        <span className="card__photo-text">
          <span className="card__category">{product.category}</span>
        </span>
        <span className="card__mark" aria-hidden="true">
          {categoryMark(product.category)}
        </span>
      </div>

      <div className="card__body">
        <div>
          <h3 className="card__title">{product.nameUk}</h3>
          {product.nameDe && (
            <div lang="de" className="card__de">
              {product.nameDe}
            </div>
          )}
          {shownVariant?.price != null && (
            <div className="card__price">
              <strong>{formatPrice(shownVariant.price)}</strong> <span className="muted">{t('card.priceDate', { date: formatDate(shownVariant.updatedAt) })}</span>
            </div>
          )}
        </div>

        <div role="group" aria-label={t('card.sizeGroup')} className="sizes">
          {product.variants.map((v) => {
            const isSel = v.sku === selectedSku;
            const q = cart.find((i) => i.sku === v.sku)?.quantity;
            return (
              <button
                key={v.sku}
                type="button"
                className={`size size--${v.stock}${isSel ? ' is-selected' : ''}`}
                aria-pressed={isSel}
                aria-label={t('card.sizeAria', { size: v.size, status: t(`stock.${v.stock}`), cart: q ? t('card.sizeInCartAria', { quantity: q }) : '' })}
                onClick={() => setPicked(v.sku)}
              >
                <span>
                  {q ? '✓ ' : ''}
                  {v.size}
                  {q && q >= 2 ? ` ×${q}` : ''}
                </span>
                {v.stock !== 'in' && <span className="size__note">{t(`stock.${v.stock}`)}</span>}
              </button>
            );
          })}
        </div>

        <div className="card__actions">
          {line && selected ? (
            <div className="card__added-row">
              <span className="card__added">{t('card.added', { size: selected.size })}</span>
              <QuantityCounter sku={line.sku} name={product.nameUk} size={selected.size} quantity={line.quantity} disabled={locked} />
              <button type="button" className="btn btn--outline btn--danger-hover" disabled={locked} onClick={remove}>
                {t('card.remove')}
              </button>
            </div>
          ) : (
            <button type="button" className={`btn btn--primary btn--lg${selected ? '' : ' is-off'}`} aria-disabled={!selected} disabled={locked} onClick={add}>
              {selected ? t('card.add') : t('card.pick')}
            </button>
          )}
          {locked && <p className="card__note">{t('card.locked')}</p>}
          <a className="card__view" href={url} target="_blank" rel="noopener noreferrer">
            {t('card.view')}
          </a>
        </div>
      </div>
    </article>
  );
}
