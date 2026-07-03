/* Live ledger store — the Ledger screen's month-scoped view of the transactions API.

   Unlike the mock `TransactionsProvider` (which still feeds Dashboard/Summary/Modes until the
   budget/history contracts land — decision 2026-07-03), this store talks to the real backend:
   real calendar months (current month = today), each displayed month fetched via
   `?month=YYYY-MM`, navigation floored at the month the account was created.

   Mutations: `addTransaction` awaits the POST (callers surface inline errors — the Add modal
   pattern); `setTransactionAmount` applies optimistically and reconciles by refetching the
   month if the PATCH fails.

   Auth facts arrive as props (`enabled`, `floorMonth`) composed in the app layer — features
   must not import each other (Bulletproof unidirectional-import rule). */
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
import { formatMonthYear, shiftMonth, todayISO } from '@/utils/date';
import * as ledgerApi from '../api/ledger-api';
import type { LedgerCategory, NewLedgerTransaction } from '../types/ledger';

interface LedgerContextValue {
  /** Displayed month key, `YYYY-MM`. */
  month: string;
  /** e.g. "July 2026". */
  monthLabel: string;
  /** True when the displayed month is the real current month. */
  isCurrent: boolean;
  canPrev: boolean;
  canNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  /** The displayed month's transactions (all of them; the api walks pagination). */
  transactions: Transaction[];
  /** Live spending categories (picker + row icons). */
  categories: LedgerCategory[];
  /** Total expense (out) of the displayed month. */
  totalOut: Money;
  /** Total income (in) of the displayed month. */
  totalIn: Money;
  loading: boolean;
  error: string | null;
  /** Create a transaction. Rejects with the normalized API error (show it inline). */
  addTransaction: (input: NewLedgerTransaction) => Promise<void>;
  /** Optimistically edit an expense amount; refetches the month if the PATCH fails. */
  setTransactionAmount: (id: number, amount: Money) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export interface LedgerProviderProps {
  /** Fetch only while true (i.e. the session is authenticated). */
  enabled: boolean;
  /** Navigation floor, `YYYY-MM` — the month the account was created. */
  floorMonth?: string;
  children: ReactNode;
}

export function LedgerProvider({ enabled, floorMonth: floor, children }: LedgerProviderProps) {
  // The real current month; the app is no longer pinned to the mock demo timeline.
  const currentMonth = todayISO().slice(0, 7);
  // Navigation floor: the month the account was created (no data can predate it).
  const floorMonth = floor ?? currentMonth;

  const [month, setMonth] = useState(currentMonth);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Categories: bounded per-user set, loaded once per session.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    ledgerApi
      .getLedgerCategories()
      .then((cats) => active && setCategories(cats))
      .catch(() => active && setError('Could not load your categories.'));
    return () => {
      active = false;
    };
  }, [enabled]);

  // The displayed month's transactions.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    ledgerApi
      .getMonthTransactions(month)
      .then((tx) => {
        if (!active) return;
        setTransactions(tx);
        setError(null);
      })
      .catch(() => active && setError('Could not load your transactions.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, month]);

  const refetchMonth = useCallback(() => {
    ledgerApi
      .getMonthTransactions(month)
      .then(setTransactions)
      .catch(() => undefined);
  }, [month]);

  const addTransaction = useCallback(
    async (input: NewLedgerTransaction) => {
      const created = await ledgerApi.createTransaction(input);
      // Only entries dated in the displayed month belong in the visible feed; others
      // appear when their month is navigated to.
      if (created.date.slice(0, 7) === month) {
        setTransactions((prev) => [created, ...prev]);
      }
    },
    [month],
  );

  const setTransactionAmount = useCallback(
    (id: number, amount: Money) => {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, amount } : t)));
      ledgerApi.updateTransactionAmount(id, amount).catch(refetchMonth);
    },
    [refetchMonth],
  );

  const { totalOut, totalIn } = useMemo(() => {
    let out = 0;
    let inn = 0;
    for (const t of transactions) {
      if (t.direction === 'out') out += t.amount;
      else inn += t.amount;
    }
    return { totalOut: out, totalIn: inn };
  }, [transactions]);

  const isCurrent = month === currentMonth;
  const canPrev = month > floorMonth;
  const canNext = !isCurrent;

  const goPrev = useCallback(
    () => setMonth((m) => (m > floorMonth ? shiftMonth(m, -1) : m)),
    [floorMonth],
  );
  const goNext = useCallback(
    () => setMonth((m) => (m < currentMonth ? shiftMonth(m, 1) : m)),
    [currentMonth],
  );

  const value = useMemo<LedgerContextValue>(
    () => ({
      month,
      monthLabel: formatMonthYear(month),
      isCurrent,
      canPrev,
      canNext,
      goPrev,
      goNext,
      transactions,
      categories,
      totalOut,
      totalIn,
      loading,
      error,
      addTransaction,
      setTransactionAmount,
    }),
    [
      month, isCurrent, canPrev, canNext, goPrev, goNext, transactions, categories,
      totalOut, totalIn, loading, error, addTransaction, setTransactionAmount,
    ],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger must be used within a LedgerProvider');
  return ctx;
}
