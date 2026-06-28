import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Category, Money } from '@/types';
import { modeTotals, type PlanMap } from '@/utils/budget';
import * as budgetApi from '../api/budget-api';

interface BudgetContextValue {
  categories: Category[];
  plan: PlanMap;
  monthlyIncome: Money;
  /** Planned total for each mode across all categories. */
  totals: Money[];
  loading: boolean;
  error: string | null;
  setPlanCell: (categoryName: string, modeIdx: number, value: Money) => void;
  addCategory: (input: Category) => void;
}

const BudgetContext = createContext<BudgetContextValue | null>(null);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [plan, setPlan] = useState<PlanMap>({});
  const [monthlyIncome, setMonthlyIncome] = useState<Money>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      budgetApi.getCategories(),
      budgetApi.getPlan(),
      budgetApi.getMonthlyIncome(),
    ])
      .then(([cats, planMap, income]) => {
        if (!active) return;
        setCategories(cats);
        setPlan(planMap);
        setMonthlyIncome(income);
      })
      .catch(() => active && setError('Could not load your budget.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const setPlanCell = useCallback((categoryName: string, modeIdx: number, value: Money) => {
    setPlan((prev) => {
      const row = prev[categoryName];
      if (!row) return prev;
      const next = row.slice() as PlanMap[string];
      next[modeIdx] = value;
      return { ...prev, [categoryName]: next };
    });
    void budgetApi.updatePlanCell(categoryName, modeIdx, value);
  }, []);

  const addCategory = useCallback((input: Category) => {
    setCategories((prev) => [...prev, input]);
    setPlan((prev) => ({ ...prev, [input.name]: [0, 0, 0, 0, 0] }));
    void budgetApi.addCategory(input);
  }, []);

  const totals = useMemo(() => modeTotals(plan, categories), [plan, categories]);

  const value = useMemo<BudgetContextValue>(
    () => ({ categories, plan, monthlyIncome, totals, loading, error, setPlanCell, addCategory }),
    [categories, plan, monthlyIncome, totals, loading, error, setPlanCell, addCategory],
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}

export function useBudget(): BudgetContextValue {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within a BudgetProvider');
  return ctx;
}
