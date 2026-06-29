import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SavingsGoal } from '@/types';
import { getSavingsGoal, updateSavingsGoal, type SavingsGoalPatch } from '../api/savings-api';

interface SavingsContextValue {
  savings: SavingsGoal | null;
  loading: boolean;
  error: string | null;
  /** Update the goal's target amount and/or label. */
  update: (patch: SavingsGoalPatch) => void;
}

const SavingsContext = createContext<SavingsContextValue | null>(null);

export function SavingsProvider({ children }: { children: ReactNode }) {
  const [savings, setSavings] = useState<SavingsGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSavingsGoal()
      .then((goal) => active && setSavings(goal))
      .catch(() => active && setError('Could not load your savings goal.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((patch: SavingsGoalPatch) => {
    setSavings((prev) => (prev ? { ...prev, ...patch } : prev));
    void updateSavingsGoal(patch);
  }, []);

  const value = useMemo<SavingsContextValue>(
    () => ({ savings, loading, error, update }),
    [savings, loading, error, update],
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

export function useSavings(): SavingsContextValue {
  const ctx = useContext(SavingsContext);
  if (!ctx) throw new Error('useSavings must be used within a SavingsProvider');
  return ctx;
}
