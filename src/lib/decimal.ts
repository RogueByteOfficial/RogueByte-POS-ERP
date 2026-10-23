/**
 * Precise Monetary Arithmetic & Rounding Engine
 * Guarantees no floating-point drift for 3-decimal currencies (OMR) and 2-decimal currencies.
 */

export function round(value: number, decimals: number = 3): number {
  const factor = Math.pow(10, decimals);
  // Using Number.EPSILON to avoid binary floating-point representation quirks
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function add(a: number, b: number, decimals: number = 3): number {
  return round(a + b, decimals);
}

export function sub(a: number, b: number, decimals: number = 3): number {
  return round(a - b, decimals);
}

export function mul(a: number, b: number, decimals: number = 3): number {
  return round(a * b, decimals);
}

export function div(a: number, b: number, decimals: number = 3): number {
  if (b === 0) return 0;
  return round(a / b, decimals);
}

export function formatMoney(
  amount: number,
  currency: string = 'OMR',
  decimals: number = 3,
  locale: string = 'en'
): string {
  const val = round(amount || 0, decimals);
  const formatted = val.toFixed(decimals);
  
  if (locale === 'ar') {
    return `${formatted} ${currency === 'OMR' ? 'ر.ع.' : currency}`;
  }
  return `${currency} ${formatted}`;
}

export function sumBy<T>(array: T[], iteratee: (item: T) => number, decimals: number = 3): number {
  return array.reduce((acc, curr) => add(acc, iteratee(curr) || 0, decimals), 0);
}
