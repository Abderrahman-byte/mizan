import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SavingsGoal } from '@/types';
import { getSavingsGoal } from '../api/savings-api';

interface SavingsContextValue {
  savings: SavingsGoal | null;
  loading: boolean;
  error: string | null;
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

  const value = useMemo<SavingsContextValue>(
    () => ({ savings, loading, error }),
    [savings, loading, error],
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

export function useSavings(): SavingsContextValue {
  const ctx = useContext(SavingsContext);
  if (!ctx) throw new Error('useSavings must be used within a SavingsProvider');
  return ctx;
}
