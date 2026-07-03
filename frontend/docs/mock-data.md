# Mizan Frontend — Mock Data Layer

There is **no API integration yet**. The app runs on a typed in-memory mock that mirrors the
shape we expect from the eventual REST API, so switching to the real backend is a localized
change. This is a deliberate, confirmed decision (see `decisions.md`).

> The backend API contract is **not finalized**. The domain types and `api/` signatures here are
> our *expected* shape; reconcile them with the confirmed backend contract when it lands.

> **Exceptions — live features.** **Auth** (`backend/docs/auth.md`) and the **People / debt-loan
> ledger** (`backend/docs/debts.md`) are confirmed + implemented, so `features/auth/api/auth-api.ts`
> and `features/people/api/people-api.ts` call the real backend through the Axios client and do
> **not** use this mock layer (their types live in the feature, not `src/types`). The **Ledger
> screen** is also live (2026-07-03): `features/transactions` gained live pieces
> (`types/ledger.ts`, `api/ledger-api.ts`, `stores/ledger-store.tsx` → `useLedger`) against
> `backend/docs/transactions.md`. Everything below applies to the domain features still on mock
> (budget, savings, history) — **plus** the mock `TransactionsProvider`/`useTransactions` in this
> same feature, which still seeds the Dashboard/Summary/Modes aggregates (`actuals`/`incomeIn`
> via `useMonthMode`) from the June demo data; retire it when budget/history go live. The
> mock `db.people` / `db.personHistory` and the `Person` / `PersonEntry` types are now unused by the
> People feature and remain only as dormant seed data.

## Pieces

- **`src/types/`** — framework-agnostic domain models (`Category`, `Transaction`, `Person`,
  `PersonEntry`, `SavingsGoal`, `MonthHistory`, `ModeIndex`, …). These are the contract both the
  mock and the future Axios layer produce.
- **`src/lib/mock/db.ts`** — the single in-memory source of truth (seeded from the prototype's
  data). Only feature `api/` modules read or mutate it. Transactions for the current month
  (June 2026) are hand-authored; **past-month transactions are synthesized** at module load from
  each `history` row so their `out`/`in` sums equal that month's `spent`/`income` (see
  `generateHistoryTransactions`). A `Transaction.date` is an ISO calendar date (`YYYY-MM-DD`);
  the Ledger filters the feed by the displayed month, and current-month spend/income aggregation
  in `transactions-store` is scoped to the active month (`2026-06`).
- **`src/lib/mock/mock-request.ts`** — `mockRequest(produce)` resolves a value as a Promise after
  a small simulated latency and returns a deep clone (callers can't mutate the store by
  reference). This keeps the `api/` functions async, exercising loading states.
- **Per-feature `api/` modules** — e.g. `features/transactions/api/transactions-api.ts`. Typed
  async functions (`getTransactions()`, `addTransaction()`, …). **Nothing else** touches the data
  source; components/hooks/pages call these (or the feature's store hook), never the store or
  Axios directly.
- **`src/lib/api-client.ts`** — the real, configured Axios instance (base URL from `config/env`,
  response-envelope unwrap + error normalization). Wired but **dormant**.

## Data flow

`db.ts` → feature `api/` (async, typed) → feature Context store (`stores/<feature>-store.tsx`,
holds state + optimistic mutations) → `use<Feature>()` hook → screens/pages. Mutations update
local state immediately and call the matching `api/` function (which mutates the mock store).

## Swapping to the real API (per endpoint)

Each `api/` function already carries the target call in a comment. To go live, replace the body —
not the signature:

```ts
// before (mock)
export function getTransactions(): Promise<Transaction[]> {
  // return apiClient.get('/transactions').then((r) => r.data);
  return mockRequest(() => db.transactions);
}

// after (real)
export function getTransactions(): Promise<Transaction[]> {
  return apiClient.get('/transactions').then((r) => r.data);
}
```

Because stores, hooks, components, and pages only depend on the `api/` signatures, they don't
change. Do this endpoint-by-endpoint as the backend confirms each route, and align the
`src/types` models with the confirmed payloads at the same time.
