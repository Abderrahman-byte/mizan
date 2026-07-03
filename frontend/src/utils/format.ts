import type { Money } from '@/types';

/** Format an amount as Dirham, e.g. `11800` → `"11,800 DH"`, `-250` → `"-250 DH"`. */
export function formatDH(n: Money): string {
  const neg = n < 0;
  const s = Math.abs(Math.round(n)).toLocaleString('en-US');
  return (neg ? '-' : '') + s + ' DH';
}

/** Compact format for axis labels, e.g. `30000` → `"30k"`, `1500` → `"1.5k"`. */
export function formatShort(n: Money): string {
  const a = Math.abs(n);
  if (a >= 1000) {
    return (n / 1000).toFixed(a % 1000 === 0 ? 0 : 1).replace('.0', '') + 'k';
  }
  return String(Math.round(n));
}

/** Thousands-separated number without the unit, e.g. `3200` → `"3,200"`. */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Thousands-separated amount preserving up to 2 decimals (trailing `.00` dropped),
 *  e.g. `1500.5` → `"1,500.5"`, `250` → `"250"`. For money that can carry centimes. */
export function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** `formatAmount` with the DH unit, e.g. `1500.5` → `"1,500.5 DH"`. */
export function formatAmountDH(n: number): string {
  return formatAmount(n) + ' DH';
}
