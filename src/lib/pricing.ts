import type { CartItem, Product, Stock } from './types';

export interface PricedLine {
  item: CartItem;
  name: string;
  stock: Stock;
  price: number | null;
  lineTotal: number | null;
}

export interface OrderTotals {
  lines: number;
  units: number;
  total: number | null;
  unpriced: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Ціни й назви беруться з поточного каталогу; SKU, якого там немає, вважається без ціни. */
export function resolveLines(items: CartItem[], products: Product[]): PricedLine[] {
  return items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
    const variant = product?.variants.find((v) => v.sku === item.sku);
    const price = variant?.price ?? null;
    return {
      item,
      name: product?.nameUk ?? item.name,
      stock: variant?.stock ?? item.stock,
      price,
      lineTotal: price === null ? null : round2(price * item.quantity),
    };
  });
}

export function orderTotals(lines: PricedLine[]): OrderTotals {
  const priced = lines.filter((l) => l.lineTotal !== null);
  return {
    lines: lines.length,
    units: lines.reduce((sum, l) => sum + l.item.quantity, 0),
    total: priced.length === 0 ? null : round2(priced.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0)),
    unpriced: lines.length - priced.length,
  };
}

/** Значення для поля «Сума»: цифри з десятковою комою без роздільників тисяч. */
export function formatSumField(total: number): string {
  return String(round2(total)).replace('.', ',');
}
