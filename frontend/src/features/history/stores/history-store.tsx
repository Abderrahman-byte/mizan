import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { MonthHistory } from '@/types';
import { getHistory, getHistoryMeta } from '../api/history-api';

interface HistoryContextValue {
  history: MonthHistory[];
  /** Current month label, e.g. "June 2026". */
  monthLabel: string;
  /** When tracking began, e.g. "May 2025". */
  trackingSince: string;
  loading: boolean;
  error: string | null;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<MonthHistory[]>([]);
  const [monthLabel, setMonthLabel] = useState('');
  const [trackingSince, setTrackingSince] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getHistory(), getHistoryMeta()])
      .then(([months, meta]) => {
        if (!active) return;
        setHistory(months);
        setMonthLabel(meta.month);
        setTrackingSince(meta.trackingSince);
      })
      .catch(() => active && setError('Could not load your history.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<HistoryContextValue>(
    () => ({ history, monthLabel, trackingSince, loading, error }),
    [history, monthLabel, trackingSince, loading, error],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used within a HistoryProvider');
  return ctx;
}
