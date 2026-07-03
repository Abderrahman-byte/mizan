// Mock store — still feeds Dashboard/Summary/Modes (via useMonthMode) until the
// budget/history contracts land. The Ledger screen itself runs on the live store below.
export { TransactionsProvider, useTransactions } from './stores/transactions-store';
export type { NewTransaction } from './api/transactions-api';

// Live ledger (real backend — see backend/docs/transactions.md).
export { LedgerProvider, useLedger } from './stores/ledger-store';
export type { LedgerCategory, NewLedgerTransaction } from './types/ledger';

export { LedgerScreen } from './components/LedgerScreen';
export type { LedgerViewModel } from './components/LedgerScreen';
export { AddTransactionModal } from './components/AddTransactionModal';
export { TransactionRow } from './components/TransactionRow';
