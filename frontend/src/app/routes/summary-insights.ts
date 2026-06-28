import type { IconName } from '@/components';
import { MODE_COUNT } from '@/config/modes';
import type { ActualsMap } from '@/utils/budget';
import type { Category, MonthHistory, Money } from '@/types';

export interface CategoryLifetime {
  name: string;
  icon: IconName;
  total: Money;
}

export interface SummaryInsights {
  lifeIncome: Money;
  lifeSpent: Money;
  avgSpent: Money;
  monthsOnPlan: number;
  onPlanPct: number;
  /** Heuristic average savings rate (leftover + savings allocation ≈ rate). */
  avgRate: number;
  modeCounts: number[];
  topMode: number;
  leanStreak: number;
  leanMonth: MonthHistory;
  bigMonth: MonthHistory;
  catLifetime: CategoryLifetime[];
}

/**
 * Derive the all-time Summary figures from the monthly history plus this month's
 * per-category spend (extrapolated across the tracked months). Pure so it can be
 * memoized and unit-tested; mirrors the prototype's data.js derivations.
 */
export function buildSummaryInsights(
  history: MonthHistory[],
  categories: Category[],
  actuals: ActualsMap,
): SummaryInsights {
  const months = history.length || 1;
  const lifeIncome = history.reduce((s, h) => s + h.income, 0);
  const lifeSpent = history.reduce((s, h) => s + h.spent, 0);
  const lifeNet = lifeIncome - lifeSpent;

  const modeCounts = Array.from({ length: MODE_COUNT }, () => 0);
  for (const h of history) modeCounts[h.mode]++;
  const topMode = modeCounts.indexOf(Math.max(...modeCounts));

  const monthsOnPlan = history.filter((h) => h.mode <= 2).length;

  let leanStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].mode <= 2) leanStreak++;
    else break;
  }

  const leanMonth = history.reduce((a, b) => (b.spent < a.spent ? b : a), history[0]);
  const bigMonth = history.reduce((a, b) => (b.spent > a.spent ? b : a), history[0]);

  const catLifetime: CategoryLifetime[] = categories
    .map((c) => ({ name: c.name, icon: c.icon, total: (actuals[c.name] ?? 0) * months }))
    .sort((a, b) => b.total - a.total);

  return {
    lifeIncome,
    lifeSpent,
    avgSpent: Math.round(lifeSpent / months),
    monthsOnPlan,
    onPlanPct: Math.round((monthsOnPlan / months) * 100),
    avgRate: Math.round((lifeNet / (lifeIncome || 1)) * 100 + 9),
    modeCounts,
    topMode,
    leanStreak,
    leanMonth,
    bigMonth,
    catLifetime,
  };
}
