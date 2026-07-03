import type { DebtDirection, DebtStatus } from '../types/debts';

/** Colors for a person's balance: owed-to-you (green), you-owe (blue), settled (faint). */
export const OWE_YOU = 'var(--good)';
export const YOU_OWE = 'var(--cool)';
export const SETTLED = 'var(--ink-faint)';

export function colorForBalance(balance: number): string {
  if (balance > 0) return OWE_YOU;
  if (balance < 0) return YOU_OWE;
  return SETTLED;
}

export function statusForBalance(balance: number): string {
  if (balance > 0) return 'owes you';
  if (balance < 0) return 'you owe';
  return 'settled up';
}

/** Signed-amount prefix: '+' for owed-to-you, '−' for you-owe, '' for settled. */
export function signForBalance(balance: number): string {
  if (balance > 0) return '+';
  if (balance < 0) return '−';
  return '';
}

/** Direction colour from the user's perspective: they-owe-you (green) vs you-owe (blue). */
export function colorForDirection(direction: DebtDirection): string {
  return direction === 'OWED_TO_ME' ? OWE_YOU : YOU_OWE;
}

export function labelForDirection(direction: DebtDirection): string {
  return direction === 'OWED_TO_ME' ? 'They owe you' : 'You owe them';
}

/** Sign of a debt's outstanding from the user's perspective (for the net balance roll-up). */
export function signForDirection(direction: DebtDirection): 1 | -1 {
  return direction === 'OWED_TO_ME' ? 1 : -1;
}

const STATUS_LABELS: Record<DebtStatus, string> = {
  open: 'Open',
  partially_paid: 'Partly paid',
  settled: 'Settled',
  written_off: 'Written off',
};

const STATUS_COLORS: Record<DebtStatus, string> = {
  open: 'var(--ink-soft)',
  partially_paid: 'var(--warn)',
  settled: 'var(--good)',
  written_off: 'var(--ink-faint)',
};

export function labelForStatus(status: DebtStatus): string {
  return STATUS_LABELS[status];
}

export function colorForStatus(status: DebtStatus): string {
  return STATUS_COLORS[status];
}
