/* Transactions-ledger API — live backend (see backend/docs/transactions.md).
   The Axios client unwraps the `{ data }` envelope; `getAll` walks pagination.

   Responses are mapped to the shared UI `Transaction` shape (lowercase direction, number
   amount, category as a display name) so `LedgerScreen`/`TransactionRow` stay unchanged;
   requests are mapped the other way ("IN"/"OUT", decimal-string amounts, categoryId). */
import { ICON_NAMES, type IconName } from '@/components/icon';
import { apiClient, getAll } from '@/lib/api-client';
import type { Transaction } from '@/types';
import type { LedgerCategory, NewLedgerTransaction } from '../types/ledger';

/** Display name used for income entries, whose live category is null. */
export const INCOME_CATEGORY_LABEL = 'Income';

// --- wire (raw) shapes: exactly as the API returns ---

interface RawCategory {
  id: number;
  name: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface RawTransaction {
  id: number;
  direction: 'IN' | 'OUT';
  amount: string;
  description: string;
  category: { id: number; name: string; icon: string } | null;
  occurredOn: string;
  createdAt: string;
  updatedAt: string;
}

/** Icons cross the wire as opaque tokens; unknown ones fall back to a safe glyph. */
function safeIcon(icon: string): IconName {
  return (ICON_NAMES as string[]).includes(icon) ? (icon as IconName) : 'wallet';
}

const mapCategory = (c: RawCategory): LedgerCategory => ({
  id: c.id,
  name: c.name,
  icon: safeIcon(c.icon),
});

const mapTransaction = (t: RawTransaction): Transaction => ({
  id: t.id,
  date: t.occurredOn,
  description: t.description,
  category: t.category?.name ?? INCOME_CATEGORY_LABEL,
  amount: Number(t.amount),
  direction: t.direction === 'IN' ? 'in' : 'out',
});

// --- categories ---

export async function getLedgerCategories(): Promise<LedgerCategory[]> {
  const res = await apiClient.get<RawCategory[]>('/v1/categories');
  return res.data.map(mapCategory);
}

// --- transactions ---

/** Every transaction of one calendar month (`YYYY-MM`), newest first. */
export async function getMonthTransactions(month: string): Promise<Transaction[]> {
  const items = await getAll<RawTransaction>('/v1/transactions', { month });
  return items.map(mapTransaction);
}

export async function createTransaction(input: NewLedgerTransaction): Promise<Transaction> {
  const res = await apiClient.post<RawTransaction>('/v1/transactions', {
    direction: input.direction === 'in' ? 'IN' : 'OUT',
    amount: String(input.amount),
    description: input.description,
    ...(input.direction === 'out' ? { categoryId: input.categoryId } : {}),
    occurredOn: input.date,
  });
  return mapTransaction(res.data);
}

export async function updateTransactionAmount(
  id: number,
  amount: number,
): Promise<Transaction> {
  const res = await apiClient.patch<RawTransaction>(`/v1/transactions/${id}`, {
    amount: String(amount),
  });
  return mapTransaction(res.data);
}
