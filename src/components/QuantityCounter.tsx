import { setQuantity } from '../lib/cart';
import { t } from '../lib/i18n';
import { announce } from '../lib/live';
import { QTY_MAX, QTY_MIN } from '../lib/types';

interface Props {
  sku: string;
  name: string;
  size: string;
  quantity: number;
  disabled?: boolean;
}

export function QuantityCounter({ sku, name, size, quantity, disabled = false }: Props) {
  function change(delta: number) {
    const next = quantity + delta;
    setQuantity(sku, next);
    announce(t('live.quantity', { quantity: next }));
  }

  return (
    <div role="group" className="qty" aria-label={t('qty.group', { name, size })}>
      <button type="button" className="btn btn--outline qty__btn" aria-label={t('qty.dec', { name, size })} disabled={disabled || quantity <= QTY_MIN} onClick={() => change(-1)}>
        −
      </button>
      <span className="qty__value">
        {quantity}
      </span>
      <button type="button" className="btn btn--outline qty__btn" aria-label={t('qty.inc', { name, size })} disabled={disabled || quantity >= QTY_MAX} onClick={() => change(1)}>
        +
      </button>
    </div>
  );
}
