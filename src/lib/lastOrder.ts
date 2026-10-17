/** Підсумок останнього відправленого замовлення для екрана «Дякуємо» (лише в пам'яті). */
export interface LastOrder {
  count: number;
  name: string;
  phone: string;
}

let last: LastOrder | null = null;

export function setLastOrder(order: LastOrder | null): void {
  last = order;
}

export function getLastOrder(): LastOrder | null {
  return last;
}
