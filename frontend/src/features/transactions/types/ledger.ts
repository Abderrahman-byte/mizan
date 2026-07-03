/* Transactions-ledger types — the live backend contract (see backend/docs/transactions.md).

   Wire specifics the api layer normalizes for the UI: money crosses as decimal strings
   ("1500.50") and is parsed to `number`; `direction` crosses as "IN"/"OUT" and maps to the
   UI's 'in'/'out'; a transaction's category is an embedded object (null exactly for income)
   and is flattened to the display name (with "Income" standing in for null) so the existing
   Ledger components keep working on the shared `Transaction` shape. */
import type { IconName } from '@/components/icon';
import type { Money, TransactionDirection } from '@/types';

/** A live spending category (`GET /categories`). `icon` is normalized to a known
 *  Bloom icon token by the api layer (unknown tokens fall back to `wallet`). */
export interface LedgerCategory {
  id: number;
  name: string;
  icon: IconName;
}

/** Input for a new ledger entry, as the Add modal produces it (UI conventions:
 *  lowercase direction, number amount). `categoryId` is required for 'out' and
 *  must be null for 'in' — the backend enforces this rule. */
export interface NewLedgerTransaction {
  direction: TransactionDirection;
  amount: Money;
  description: string;
  categoryId: number | null;
  /** Calendar date, ISO `YYYY-MM-DD`. */
  date: string;
}
