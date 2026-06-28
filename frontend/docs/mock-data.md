# Mizan Frontend — Mock Data Layer

There is **no API integration yet**. The app runs on a typed in-memory mock that mirrors the
shape we expect from the eventual REST API, so switching to the real backend is a localized
change. This is a deliberate, confirmed decision (see `decisions.md`).

> The backend API contract is **not finalized**. The domain types and `api/` signatures here are
> our *expected* shape; reconcile them with the confirmed backend contract when it lands.

## Pieces

- **`src/types/`** — framework-agnostic domain models (`Category`, `Transaction`, `Person`,
  `PersonEntry`, `SavingsGoal`, `MonthHistory`, `ModeIndex`, …). These are the contract both the
  mock and the future Axios layer produce.
- **`src/lib/mock/db.ts`** — the single in-memory source of truth (seeded from the prototype's
  data). Only feature `api/` modules read or mutate it.
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
