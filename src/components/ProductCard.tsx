import { useState } from 'react';
import { addToCart, removeFromCart, useCart } from '../lib/cart';
import { t } from '../lib/i18n';
import { announce } from '../lib/live';
import { categoryMark, formatDate } from '../lib/ui';
import type { Product } from '../lib/types';

function formatPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} €`;
}

export function ProductCard({ product, tint }: { product: Product; tint: string }) {
  const cart = useCart();
  const [picked, setPicked] = useState<string | null>(null);
  const selectedSku = picked ?? (product.variants.length === 1 ? product.variants[0].sku : null);
  const selected = product.variants.find((v) => v.sku === selectedSku);
  const added = selected ? cart.some((i) => i.sku === selected.sku) : false;
  const url = product.variants[0].sourceUrl;
  const priced = product.variants.find((v) => v.price !== null);

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
      <a className="card__photo" href={url} target="_blank" rel="noopener noreferrer" aria-label={t('card.photoAria', { name: product.nameUk })} style={{ background: tint }}>
        <span className="card__photo-text">
          <span className="card__category">{product.category}</span>
          <span className="card__photo-link">{t('card.photo')}</span>
        </span>
        <span className="card__mark" aria-hidden="true">
          {categoryMark(product.category)}
        </span>
      </a>

      <div className="card__body">
        <div>
          <h3 className="card__title">{product.nameUk}</h3>
          {product.nameDe && (
            <div lang="de" className="card__de">
              {product.nameDe}
            </div>
          )}
          {priced?.price != null && (
            <div className="card__price">
              <strong>{formatPrice(priced.price)}</strong> <span className="muted">{t('card.priceDate', { date: formatDate(priced.updatedAt) })}</span>
            </div>
          )}
        </div>

        <div role="group" aria-label={t('card.sizeGroup')} className="sizes">
          {product.variants.map((v) => {
            const isSel = v.sku === selectedSku;
            const inCart = cart.some((i) => i.sku === v.sku);
            return (
              <button
                key={v.sku}
                type="button"
                className={`size size--${v.stock}${isSel ? ' is-selected' : ''}`}
                aria-pressed={isSel}
                aria-label={t('card.sizeAria', { size: v.size, status: t(`stock.${v.stock}`), cart: inCart ? t('card.sizeInCartAria') : '' })}
                onClick={() => setPicked(v.sku)}
              >
                <span>
                  {inCart ? '✓ ' : ''}
                  {v.size}
                </span>
                {v.stock !== 'in' && <span className="size__note">{t(`stock.${v.stock}`)}</span>}
              </button>
            );
          })}
        </div>

        <div className="card__actions">
          {added ? (
            <div className="card__added-row">
              <span className="card__added">{t('card.added', { size: selected?.size ?? '' })}</span>
              <button type="button" className="btn btn--outline btn--danger-hover" onClick={remove}>
                {t('card.remove')}
              </button>
            </div>
          ) : (
            <button type="button" className={`btn btn--primary btn--lg${selected ? '' : ' is-off'}`} aria-disabled={!selected} onClick={add}>
              {selected ? t('card.add') : t('card.pick')}
            </button>
          )}
          <a className="card__view" href={url} target="_blank" rel="noopener noreferrer">
            {t('card.view')}
          </a>
        </div>
      </div>
    </article>
  );
}
