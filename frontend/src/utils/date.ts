/* Date helpers for the ledger. Dates are plain ISO calendar dates
   (YYYY-MM-DD) — no time, no timezone — so they sort and compare as strings. */

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Build an ISO date string from parts. `month` is 0-indexed (0 = January). */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Parse an ISO date into numeric parts. `month` is 0-indexed. */
export function parseISO(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

/** Days in a given month. `month` is 0-indexed. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Weekday (0 = Sunday) of the first of the month. `month` is 0-indexed. */
export function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** e.g. `"2026-06-29"` → `"Jun 29"`. */
export function formatMonthDay(iso: string): string {
  const { month, day } = parseISO(iso);
  return `${MONTHS_SHORT[month]} ${day}`;
}

/** Today as an ISO calendar date (`YYYY-MM-DD`), in the user's local timezone. */
export function todayISO(): string {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/** A month key (`YYYY-MM`) shifted by `delta` months (e.g. `-1` = previous month). */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const shifted = new Date(y, m - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

/** e.g. `"2026-07"` → `"July 2026"`. */
export function formatMonthYear(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}
