# Mizan Backend — Transactions Ledger

The monthly spending/income ledger (the frontend's **Ledger** screen) plus its per-user
**spending categories**. Designed with the user on 2026-07-03; implemented and verified
end-to-end the same day. Owned by the `transactions` module (`app/modules/transactions/`),
routes in `app/api/v1/categories.py` + `app/api/v1/transactions.py`.

Everything here follows the global conventions (`conventions.md`): camelCase JSON, standard
success/error envelopes, money as **decimal strings** (`"1500.50"`, `NUMERIC(12,2)`, DH only),
dates as `"YYYY-MM-DD"`, all routes Bearer-guarded and scoped to the authenticated user.

---

## Core model

- A **transaction** is a single ledger entry: money **out** (an expense) or **in** (income),
  on a calendar date, with a free-text description.
- **Expenses (`OUT`) always carry a category; income (`IN`) never does.** This is the
  category↔direction rule — the budget/spending-mode feature plans per *expense* category, and
  the UI shows no category picker for income.
- **Categories** are per-user rows (name + icon). Every account starts with a pre-created
  default set (see below) and can add/edit/delete freely.
- The ledger is **month-oriented**: the list filters by `?month=YYYY-MM`, and a summary
  endpoint aggregates one month in SQL (the paginated list can't feed client-side totals).
- Standalone in v1: no link yet to budgeting/spending-mode tables (like the debt ledger).

## Tables

Standard `id`/`created_at`/`updated_at` (`IdTimestampMixin`) omitted. Also listed in `schema.md`.

### `categories`

| Column    | Type          | Constraints                            | Notes                                   |
|-----------|---------------|----------------------------------------|------------------------------------------|
| `user_id` | `BigInteger`  | NOT NULL, FK→`users.id` (CASCADE), idx | Owner. `ix_categories_user_id`.          |
| `name`    | `String(100)` | NOT NULL                               | Unique per user, case-insensitively (functional index `uq_categories_user_name` on `(user_id, lower(name))`). |
| `icon`    | `String(50)`  | NOT NULL                               | Opaque frontend icon token (`"cart"`, `"home"`, …); the backend stores it, never interprets it. |

### `transactions`

| Column        | Type            | Constraints                            | Notes                                    |
|---------------|-----------------|----------------------------------------|-------------------------------------------|
| `user_id`     | `BigInteger`    | NOT NULL, FK→`users.id` (CASCADE), idx | Owner. `ix_transactions_user_id`.         |
| `category_id` | `BigInteger`    | NULL, FK→`categories.id`, idx          | **No** ondelete cascade — category delete is blocked in the service (FK restricts as backstop). NULL exactly when `direction = IN` (CHECK `ck_transactions_category_direction`). |
| `direction`   | enum `transaction_direction` | NOT NULL                  | `IN` \| `OUT` (native PG enum).           |
| `amount`      | `NUMERIC(12,2)` | NOT NULL, CHECK > 0                    | `ck_transactions_amount_positive`. DH; no currency column. |
| `description` | `String(255)`   | NOT NULL                               | The entry's label (required, trimmed).    |
| `occurred_on` | `Date`          | NOT NULL                               | Calendar date; defaults to today when omitted. |

- Migration: `d17b6fd71465` (`create transactions ledger tables`) — also **backfills** the
  default category set for users that existed before it ran.

## Business rules

- **Category↔direction (409 `CATEGORY_DIRECTION_MISMATCH`):** `OUT` requires a `categoryId`
  (the user's own — else 404); `IN` must not send one. Enforced in the service on create *and*
  update, with the DB CHECK as backstop. On PATCH: flipping a transaction to `IN` clears its
  category automatically; flipping to `OUT` requires a `categoryId` in the same request.
- **Category name uniqueness (409 `CATEGORY_NAME_TAKEN`):** per user, case-insensitive
  (pre-checked; DB functional unique index as race backstop) — same pattern as counterparties.
- **Category delete blocked (409 `CATEGORY_HAS_TRANSACTIONS`)** while any transaction
  references it — same pattern as `COUNTERPARTY_HAS_DEBTS`.
- **Fully mutable:** transactions support full CRUD; every field is editable.
- **Default categories:** every account starts with this 14-entry set (name/icon):
  Rent/home, Groceries/cart, Utilities/bolt, Phone & net/wifi, Transport & gas/car,
  Family support/heart, Eating out/fork, Coffee/cup, Cigarettes/smoke, Gym/dumbbell,
  Dating/spark, Clothes/shirt, Subscriptions/play, Savings/piggy.
  Seeded by `service.seed_default_categories` **inside the registration transaction**
  (documented cross-module call: `auth.service.register` → `transactions.service`) and
  backfilled for pre-existing users by the migration (which duplicates the list on purpose —
  migrations don't import evolving app code; keep the two in sync).

## Endpoint surface

All under `/api/v1`, all requiring `Authorization: Bearer <access-token>`.

### Categories

| Method & path              | Purpose                                                    | Success |
|----------------------------|------------------------------------------------------------|---------|
| `POST /categories`         | Create a category.                                         | 201     |
| `GET /categories`          | **Full list, unpaginated**, sorted by name (see note).     | 200     |
| `GET /categories/{id}`     | One category.                                              | 200     |
| `PATCH /categories/{id}`   | Edit name and/or icon.                                     | 200     |
| `DELETE /categories/{id}`  | Delete — **blocked** if transactions reference it.         | 204     |

> The list is deliberately unpaginated (decision 2026-07-03): the per-user set is small and
> bounded and the expense category picker needs all of it — the same documented exception as a
> debt's repayments list.

### Transactions

| Method & path                | Purpose                                                                  | Success |
|------------------------------|--------------------------------------------------------------------------|---------|
| `POST /transactions`         | Create a ledger entry.                                                   | 201     |
| `GET /transactions`          | List (**paginated**, newest first), filters: `month`, `direction`, `category_id`. | 200 |
| `GET /transactions/summary`  | One month's aggregates (`month` **required**).                           | 200     |
| `GET /transactions/{id}`     | One transaction.                                                         | 200     |
| `PATCH /transactions/{id}`   | Edit any field (≥ 1).                                                    | 200     |
| `DELETE /transactions/{id}`  | Delete the transaction.                                                  | 204     |

Route order note: `/summary` is declared before `/{transaction_id}` so it is never parsed as an id.

## Request / response contracts

### Response object shapes

**Category** (create/get/list/patch):

```json
{ "id": 7, "name": "Groceries", "icon": "cart",
  "createdAt": "2026-07-03T10:00:00Z", "updatedAt": "2026-07-03T10:00:00Z" }
```

**Transaction** (create/get/list items/patch) — embeds a slim `category` (never a flat FK id);
`category` is `null` exactly when `direction` is `"IN"`:

```json
{ "id": 42, "direction": "OUT", "amount": "150.50", "description": "Marjane run",
  "category": { "id": 7, "name": "Groceries", "icon": "cart" },
  "occurredOn": "2026-07-01",
  "createdAt": "2026-07-03T10:00:00Z", "updatedAt": "2026-07-03T10:00:00Z" }
```

**Month summary** (`GET /transactions/summary?month=2026-07`) — `byCategory` covers **expense
(OUT) totals only**, contains only categories with at least one OUT transaction that month,
ordered biggest spender first:

```json
{ "data": { "month": "2026-07", "totalOut": "1050.50", "totalIn": "11800.00",
  "byCategory": [
    { "category": { "id": 14, "name": "Savings", "icon": "piggy" }, "total": "900.00" },
    { "category": { "id": 7, "name": "Groceries", "icon": "cart" }, "total": "150.50" }
  ] } }
```

### Request bodies

| Endpoint                    | Body                                                                                             |
|-----------------------------|--------------------------------------------------------------------------------------------------|
| `POST /categories`          | `{ name (1–100, trimmed, req), icon (1–50, trimmed, req) }`                                       |
| `PATCH /categories/{id}`    | `{ name?, icon? }` (at least one field)                                                           |
| `POST /transactions`        | `{ direction (req, "IN"\|"OUT"), amount (req, >0), description (1–255, trimmed, req), categoryId (req for OUT, forbidden for IN), occurredOn? (default today) }` |
| `PATCH /transactions/{id}`  | `{ direction?, amount?, description?, categoryId?, occurredOn? }` (at least one field)            |

### Query params

- `GET /transactions`: `?page` / `?page_size` (shared pagination defaults) + optional filters
  `?month=YYYY-MM` (regex-validated, else 400 `VALIDATION_ERROR`), `?direction=IN|OUT`,
  `?category_id=<int>`. Sorted `occurred_on` DESC, `id` DESC.
- `GET /transactions/summary`: `?month=YYYY-MM` **required**.

## Error codes (Mizan-specific, this feature)

| HTTP | Code                          | Situation                                                     |
|------|-------------------------------|---------------------------------------------------------------|
| 409  | `CATEGORY_NAME_TAKEN`         | `(user_id, lower(name))` uniqueness violated.                 |
| 409  | `CATEGORY_HAS_TRANSACTIONS`   | Deleting a category that transactions still reference.        |
| 409  | `CATEGORY_DIRECTION_MISMATCH` | OUT without a category / IN with one (create or update).      |
| 404  | `CATEGORY_NOT_FOUND`          | No such category for this user.                               |
| 404  | `TRANSACTION_NOT_FOUND`       | No such transaction for this user.                            |

## Frontend integration

The **Ledger screen is wired to this backend** (2026-07-03, same day): live pieces in
`frontend/src/features/transactions/` (`types/ledger.ts`, `api/ledger-api.ts`,
`stores/ledger-store.tsx`) map the wire contract to the UI conventions (`"IN"/"OUT"` ↔
`'in'/'out'`, decimal strings ↔ numbers, embedded category → display name). Real calendar
months fetched via `?month=`; navigation floored at the account-creation month. The
Dashboard/Summary/Modes aggregates still come from the frontend's mock transactions layer
(Ledger-only scope by decision) — see `frontend/docs/decisions.md`. The UI does not yet call
`GET /transactions/summary` (it aggregates the displayed month client-side, since the feed
already fetches every page of that month) nor the category CRUD routes.
