export const ORDER_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ORDER_ID_RE = /^[0-9]{8}-[2-9A-HJKMNP-Z]{4}$/;

const LIMIT = 248; // 8 × 31: байти вище відкидаються, щоб не було зсуву розподілу

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/** Номер замовлення РРРРММДД-XXXX (дата за локальним часом пристрою). */
export function createOrderId(
  now: Date = new Date(),
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  const date = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
  let suffix = '';
  while (suffix.length < 4) {
    for (const byte of randomBytes(4 - suffix.length)) {
      if (byte < LIMIT && suffix.length < 4) suffix += ORDER_ID_ALPHABET[byte % ORDER_ID_ALPHABET.length];
    }
  }
  return `${date}-${suffix}`;
}

export function isOrderId(s: unknown): s is string {
  return typeof s === 'string' && ORDER_ID_RE.test(s);
}
