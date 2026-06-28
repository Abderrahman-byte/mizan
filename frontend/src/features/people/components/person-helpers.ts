import type { Money } from '@/types';

/** Colors for a person's balance: owed-to-you (green), you-owe (blue), settled (faint). */
export const OWE_YOU = 'var(--good)';
export const YOU_OWE = 'var(--cool)';
export const SETTLED = 'var(--ink-faint)';

export function colorForBalance(balance: Money): string {
  if (balance > 0) return OWE_YOU;
  if (balance < 0) return YOU_OWE;
  return SETTLED;
}

export function statusForBalance(balance: Money): string {
  if (balance > 0) return 'owes you';
  if (balance < 0) return 'you owe';
  return 'settled up';
}

/** Signed-amount prefix: '+' for owed-to-you, '−' for you-owe, '' for settled. */
export function signForBalance(balance: Money): string {
  if (balance > 0) return '+';
  if (balance < 0) return '−';
  return '';
}
