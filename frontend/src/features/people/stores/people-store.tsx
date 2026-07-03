import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ApiError } from '@/lib/api-client';
import * as peopleApi from '../api/people-api';
import type {
  Counterparty,
  DebtDirection,
  DebtSummaryTotals,
  UpdateCounterpartyPayload,
} from '../types/debts';

/** Input for the combined "New entry" flow: creates a counterparty + an initial debt. */
export interface NewEntryInput {
  name: string;
  direction: DebtDirection;
  /** Decimal string, e.g. "1500.50". */
  amount: string;
  note: string;
}

interface PeopleContextValue {
  counterparties: Counterparty[];
  summary: DebtSummaryTotals | null;
  loading: boolean;
  error: string | null;
  /** Reload counterparties + summary from the backend (call after debt/repayment mutations). */
  refresh: () => Promise<void>;
  createEntry: (input: NewEntryInput) => Promise<void>;
  updateCounterparty: (id: number, patch: UpdateCounterpartyPayload) => Promise<Counterparty>;
  removeCounterparty: (id: number) => Promise<void>;
}

const PeopleContext = createContext<PeopleContextValue | null>(null);

export function PeopleProvider({ children }: { children: ReactNode }) {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [summary, setSummary] = useState<DebtSummaryTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [people, totals] = await Promise.all([
      peopleApi.getCounterparties(),
      peopleApi.getSummary(),
    ]);
    setCounterparties(people);
    setSummary(totals);
  }, []);

  useEffect(() => {
    let active = true;
    refresh()
      .catch(() => active && setError('Could not load people.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refresh]);

  const createEntry = useCallback(
    async ({ name, direction, amount, note }: NewEntryInput) => {
      const trimmedNote = note.trim() || null;
      const counterparty = await peopleApi.createCounterparty({
        name: name.trim(),
        note: trimmedNote,
      });
      try {
        await peopleApi.createDebt({
          counterpartyId: counterparty.id,
          direction,
          principalAmount: amount,
          description: trimmedNote,
        });
      } catch (err) {
        // The person was created but the debt wasn't: roll the person back so a retry
        // doesn't trip the duplicate-name guard, then surface the original error.
        await peopleApi.deleteCounterparty(counterparty.id).catch(() => undefined);
        throw err;
      }
      await refresh();
    },
    [refresh],
  );

  const updateCounterparty = useCallback(
    async (id: number, patch: UpdateCounterpartyPayload) => {
      const updated = await peopleApi.updateCounterparty(id, patch);
      setCounterparties((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [],
  );

  const removeCounterparty = useCallback(async (id: number) => {
    await peopleApi.deleteCounterparty(id);
    setCounterparties((prev) => prev.filter((c) => c.id !== id));
    void peopleApi.getSummary().then(setSummary).catch(() => undefined);
  }, []);

  const value = useMemo<PeopleContextValue>(
    () => ({
      counterparties,
      summary,
      loading,
      error,
      refresh,
      createEntry,
      updateCounterparty,
      removeCounterparty,
    }),
    [counterparties, summary, loading, error, refresh, createEntry, updateCounterparty, removeCounterparty],
  );

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}

export function usePeople(): PeopleContextValue {
  const ctx = useContext(PeopleContext);
  if (!ctx) throw new Error('usePeople must be used within a PeopleProvider');
  return ctx;
}

/** Pull a human-readable message off a normalized ApiError (falls back to a default). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as Partial<ApiError> | undefined;
  return (e && typeof e === 'object' && typeof e.message === 'string' && e.message) || fallback;
}
