/* Pure spending-mode math, ported from the prototype's mizan-logic.js.
   These operate on plain data so any page can compose budget (plan) and
   transaction (actual) domains without those features importing each other. */
import type { Category, ModeIndex, ModePlan, ModeResult, Money } from '@/types';
import { MODE_COUNT } from '@/config/modes';

/** A plan map: category name → its five planned amounts. */
export type PlanMap = Record<string, ModePlan>;

/** A map of category name → actual spend this month. */
export type ActualsMap = Record<string, Money>;

/** Total planned spend for each mode across all categories. */
export function modeTotals(plan: PlanMap, cats: Category[]): Money[] {
  return Array.from({ length: MODE_COUNT }, (_, m) =>
    cats.reduce((sum, c) => sum + (plan[c.name]?.[m] ?? 0), 0),
  );
}

/** Total actual spend across all categories. */
export function totalActual(actuals: ActualsMap, cats: Category[]): Money {
  return cats.reduce((sum, c) => sum + (actuals[c.name] ?? 0), 0);
}

/** Which mode does a given actual spend land in? Highest tier whose planned
 *  total is still ≤ actual, plus a fractional position toward the next tier. */
export function computeMode(actual: Money, totals: Money[]): ModeResult {
  let idx = 0;
  for (let i = 0; i < totals.length; i++) {
    if (actual >= totals[i]) idx = i;
  }
  const lo = totals[idx];
  const hi = totals[Math.min(idx + 1, MODE_COUNT - 1)];
  const frac = hi > lo ? Math.min(1, (actual - lo) / (hi - lo)) : 0;
  return { idx: idx as ModeIndex, frac, pos: idx + (idx < MODE_COUNT - 1 ? frac : 0) };
}

/** Tier a single category's actual spend lands in, against its own plan row. */
export function rowTier(actual: Money, planRow: ModePlan): ModeIndex {
  let tier = 0;
  for (let i = 0; i < MODE_COUNT; i++) {
    if (actual >= planRow[i]) tier = i;
  }
  return tier as ModeIndex;
}
