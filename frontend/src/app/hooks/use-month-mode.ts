import { useBudget } from '@/features/budget';
import { useTransactions } from '@/features/transactions';
import type { ModeResult, Money } from '@/types';
import { computeMode, totalActual } from '@/utils/budget';

export interface MonthMode {
  /** Planned total per mode. */
  totals: Money[];
  /** Total actual spend this month. */
  totalActual: Money;
  /** Which mode the month is landing in. */
  mode: ModeResult;
  /** Reference monthly income. */
  monthlyIncome: Money;
  /** Income actually received this month (in transactions). */
  incomeIn: Money;
}

/**
 * App-level selector that joins the budget (plan) and transactions (actuals)
 * domains to answer "which spending mode is this month in?". Used by the
 * Dashboard, Ledger, and Budget Modes screens.
 */
export function useMonthMode(): MonthMode {
  const { categories, totals, monthlyIncome } = useBudget();
  const { actuals, incomeIn } = useTransactions();
  const totalAct = totalActual(actuals, categories);
  const mode = computeMode(totalAct, totals);
  return { totals, totalActual: totalAct, mode, monthlyIncome, incomeIn };
}
