import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Money, Transaction } from '@/types';
import type { ActualsMap } from '@/utils/budget';
import * as txApi from '../api/transactions-api';
import type { NewTransaction } from '../api/transactions-api';

interface TransactionsContextValue {
  transactions: Transaction[];
  /** Per-category actual spend this month (out transactions only). */
  actuals: ActualsMap;
  /** Total income received this month (in transactions). */
  incomeIn: Money;
  loading: boolean;
  error: string | null;
  addTransaction: (input: NewTransaction) => void;
  setTransactionAmount: (id: number, amount: Money) => void;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

/** The live month (ISO `YYYY-MM` prefix); actuals/income aggregate only this. */
const ACTIVE_MONTH = '2026-06';

export function TransactionsProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    txApi
      .getTransactions()
      .then((tx) => active && setTransactions(tx))
      .catch(() => active && setError('Could not load your transactions.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const addTransaction = useCallback((input: NewTransaction) => {
    setTransactions((prev) => {
      const id = prev.reduce((max, t) => Math.max(max, t.id), 0) + 1;
      return [...prev, { id, ...input }];
    });
    void txApi.addTransaction(input);
  }, []);

  const setTransactionAmount = useCallback((id: number, amount: Money) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, amount } : t)));
    void txApi.updateTransactionAmount(id, amount);
  }, []);

  const actuals = useMemo<ActualsMap>(() => {
    const map: ActualsMap = {};
    for (const t of transactions) {
      if (t.direction === 'out' && t.date.startsWith(ACTIVE_MONTH)) {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      }
    }
    return map;
  }, [transactions]);

  const incomeIn = useMemo(
    () =>
      transactions.reduce(
        (sum, t) => sum + (t.direction === 'in' && t.date.startsWith(ACTIVE_MONTH) ? t.amount : 0),
        0,
      ),
    [transactions],
  );

  const value = useMemo<TransactionsContextValue>(
    () => ({
      transactions,
      actuals,
      incomeIn,
      loading,
      error,
      addTransaction,
      setTransactionAmount,
    }),
    [transactions, actuals, incomeIn, loading, error, addTransaction, setTransactionAmount],
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within a TransactionsProvider');
  return ctx;
}
