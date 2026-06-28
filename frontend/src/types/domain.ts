/* Core domain models — the shape the UI consumes and the eventual API contract
   will return. These are intentionally framework-agnostic so both the mock data
   layer (lib/mock) and the future Axios layer (lib/api-client) can produce them.

   NOTE: the backend API contract is not finalized. When it is, reconcile these
   types with the confirmed contract (see backend docs) rather than the reverse. */
import type { IconName } from '@/components/icon';
import type { Money } from './money';

/** Index of a spending mode, 0 (leanest) … 4 (most indulgent). */
export type ModeIndex = 0 | 1 | 2 | 3 | 4;

/** A planned amount for each of the five spending modes. */
export type ModePlan = [Money, Money, Money, Money, Money];

/** Where a transaction moves money: `out` = expense, `in` = income. */
export type TransactionDirection = 'in' | 'out';

/** A spending category the user budgets against. */
export interface Category {
  name: string;
  icon: IconName;
}

/** A single ledger transaction for the active month. */
export interface Transaction {
  id: number;
  /** Day of month (1–31). */
  day: number;
  description: string;
  category: string;
  amount: Money;
  direction: TransactionDirection;
}

/** A person in the debt/loan ledger.
 *  balance > 0 → they owe you; < 0 → you owe them; 0 → settled up. */
export interface Person {
  name: string;
  balance: Money;
  note: string;
}

/** One line in a person's drill-in history.
 *  direction `out` = money left you (a loan out); `in` = money came in. */
export interface PersonEntry {
  date: string;
  label: string;
  amount: Money;
  direction: TransactionDirection;
}

/** The emergency-fund / savings goal. */
export interface SavingsGoal {
  label: string;
  goal: Money;
  saved: Money;
}

/** A historical month summary used by trends, the timeline, and past-month views. */
export interface MonthHistory {
  /** Short month name, e.g. "Jun". */
  month: string;
  /** Two-digit year, e.g. 26 for 2026. */
  year: number;
  /** The spending mode this month landed in. */
  mode: ModeIndex;
  spent: Money;
  income: Money;
  /** Emergency-fund balance at the end of this month. */
  fund: Money;
}

/** Result of computing which mode a month's spend lands in. */
export interface ModeResult {
  /** The landed mode index. */
  idx: ModeIndex;
  /** Fraction into the band toward the next tier, 0–1. */
  frac: number;
  /** Continuous position `idx + frac` for fine placement. */
  pos: number;
}
