/* Debt/loan-ledger types — the live backend contract (see backend/docs/debts.md).
   Money crosses the wire as decimal strings ("1500.50"); the api layer parses it to
   `number` here so the rest of the UI works in numbers. Request payloads send amounts
   back as strings (the backend validates `> 0`, ≤ 2 decimals). */

export type DebtDirection = 'I_OWE' | 'OWED_TO_ME';
export type DebtStatus = 'open' | 'partially_paid' | 'settled' | 'written_off';

/** A reusable contact in the ledger, with its signed net balance.
 *  balance > 0 → they owe you; < 0 → you owe them; 0 → settled. */
export interface Counterparty {
  id: number;
  name: string;
  note: string | null;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

/** Slim counterparty embedded on a debt. */
export interface CounterpartyRef {
  id: number;
  name: string;
}

export interface Repayment {
  id: number;
  amount: number;
  paidOn: string; // YYYY-MM-DD
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A discrete loan. `outstanding`/`status` are derived server-side.
 *  `repayments` is present only on the detail endpoint (GET /debts/{id}). */
export interface Debt {
  id: number;
  counterparty: CounterpartyRef;
  direction: DebtDirection;
  principalAmount: number;
  outstanding: number;
  status: DebtStatus;
  description: string | null;
  incurredOn: string; // YYYY-MM-DD
  writtenOffAt: string | null;
  createdAt: string;
  updatedAt: string;
  repayments?: Repayment[];
}

export interface DebtSummaryTotals {
  totalIOwe: number;
  totalOwedToMe: number;
  net: number;
}

// --- request payloads (amounts as strings) ---

export interface CreateCounterpartyPayload {
  name: string;
  note?: string | null;
}

export interface UpdateCounterpartyPayload {
  name?: string;
  note?: string | null;
}

export interface CreateDebtPayload {
  counterpartyId: number;
  direction: DebtDirection;
  principalAmount: string;
  description?: string | null;
  incurredOn?: string;
}

export interface UpdateDebtPayload {
  counterpartyId?: number;
  direction?: DebtDirection;
  principalAmount?: string;
  description?: string | null;
  incurredOn?: string;
}

export interface CreateRepaymentPayload {
  amount: string;
  paidOn?: string;
  note?: string | null;
}

export interface UpdateRepaymentPayload {
  amount?: string;
  paidOn?: string;
  note?: string | null;
}

/** Filters for GET /debts. */
export interface DebtFilters {
  counterpartyId?: number;
  direction?: DebtDirection;
  status?: DebtStatus;
}
