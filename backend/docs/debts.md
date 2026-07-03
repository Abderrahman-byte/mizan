# Mizan Backend — Debt / Loan Ledger

The confirmed design for the **debt/loan ledger** feature: tracking money the user owes and
money owed to the user, across many people, with partial-repayment history and per-person /
global net-position reporting.

> **Status: implemented 2026-07-01.** Models, migration (`99ef2d53f976`), schemas, repository,
> service, engine, and all routes are built and verified end-to-end against the running stack.
> Tables are also in `schema.md`; decisions are logged in `decisions.md`.

The module lives at `app/modules/debts/` (non-routing layers: `enums`, `models`, `schemas`,
`repository`, `service`, `engine`, `exceptions`); routes live at `app/api/v1/counterparties.py`
and `app/api/v1/debts.py` per the router-location rule.

---

## Core model

A **discrete debt** is one loan with a fixed `principal_amount` and a `direction`. **Partial
repayments** are child rows. The amount still owed is **derived**, never stored:

```
outstanding(debt) = principal_amount − Σ repayments.amount
```

Counterparties (the people) are **reusable contacts** owned by the user, so balances roll up
per person. DH is the only currency → no currency column. Money is `NUMERIC(12,2)`; dates that
carry no meaningful time-of-day are `DATE`.

---

## Tables

All three carry the standard `id` / `created_at` / `updated_at` from `IdTimestampMixin`
(omitted below). All are scoped to a user.

### `counterparties`

| Column     | Type          | Constraints                          | Notes                                  |
|------------|---------------|--------------------------------------|----------------------------------------|
| `user_id`  | `BigInteger`  | NOT NULL, FK→`users.id` (CASCADE), idx | Owner. `ix_counterparties_user_id`.  |
| `name`     | `String(100)` | NOT NULL                             | Person's display name.                 |
| `note`     | `Text`        | NULL                                 | Free-form note about the person.       |

- **Unique per user:** `uq_counterparties_user_name` on `(user_id, lower(name))` — one "Karim"
  per user, case-insensitive. Violation → **409 `COUNTERPARTY_NAME_TAKEN`**.

### `debts`

| Column             | Type            | Constraints                              | Notes                                       |
|--------------------|-----------------|------------------------------------------|---------------------------------------------|
| `user_id`          | `BigInteger`    | NOT NULL, FK→`users.id` (CASCADE), idx   | Owner. `ix_debts_user_id`.                  |
| `counterparty_id`  | `BigInteger`    | NOT NULL, FK→`counterparties.id`, idx    | The person. Delete blocked while referenced (see below). `ix_debts_counterparty_id`. |
| `direction`        | `enum`          | NOT NULL                                 | `I_OWE` \| `OWED_TO_ME`. Python enum in `enums.py`. |
| `principal_amount` | `NUMERIC(12,2)` | NOT NULL, CHECK > 0                      | Original loan amount.                       |
| `description`      | `String`        | NULL                                     | What the loan was for.                      |
| `incurred_on`      | `DATE`          | NOT NULL                                 | When the debt was taken on.                 |
| `written_off_at`   | `DATE`          | NULL                                     | Set = debt forgiven/cancelled (see status). NULL = active. |

### `repayments`

| Column     | Type            | Constraints                            | Notes                              |
|------------|-----------------|----------------------------------------|------------------------------------|
| `debt_id`  | `BigInteger`    | NOT NULL, FK→`debts.id` (CASCADE), idx | Parent debt. `ix_repayments_debt_id`. |
| `amount`   | `NUMERIC(12,2)` | NOT NULL, CHECK > 0                     | A single (partial) repayment.      |
| `paid_on`  | `DATE`          | NOT NULL                               | When this repayment happened.      |
| `note`     | `String`        | NULL                                   | Optional note.                     |

---

## Business rules

- **Status (derived + manual write-off).** Computed per debt:
  - `written_off_at` is set → **`written_off`** (overrides amounts).
  - else `outstanding == principal_amount` → **`open`**
  - else `outstanding <= 0` → **`settled`**
  - else → **`partially_paid`**
- **Over-repayment is allowed.** Repayments may push `outstanding` below 0; this means the
  relationship flipped (the other party has effectively over-/under-paid). `settled` therefore
  uses `outstanding <= 0`, not `== 0`. No exceed-the-principal error exists.
- **Debt fields are fully editable** at any time, including after repayments exist. Editing
  `principal_amount` can legitimately move a debt between statuses (even below Σ repayments,
  yielding a negative outstanding) — this is permitted by design.
- **Repayments are fully mutable** — they can be added, edited, and deleted to correct mistakes.
- **Write-off** forgives/cancels a debt that isn't fully repaid. A written-off debt is
  **excluded from net-position and per-person balances** and reports status `written_off`.
- **Counterparty delete is blocked** while any debt references it → **409
  `COUNTERPARTY_HAS_DEBTS`**. The user resolves/deletes the debts first.

### Reporting math (derived in the service, no extra tables)

Written-off debts are excluded from all of the below.

```
per-person balance(cp) = Σ over cp's debts of signed_outstanding
global:
  totalIOwe     = Σ outstanding where direction = I_OWE
  totalOwedToMe = Σ outstanding where direction = OWED_TO_ME
  net           = totalOwedToMe − totalIOwe
```

`signed_outstanding` is `+outstanding` for `OWED_TO_ME` and `−outstanding` for `I_OWE`, so a
negative `outstanding` (over-repayment) naturally flips its contribution to the balance.

---

## Endpoint surface

All routes are under `/api/v1`, guarded by `CurrentUser`, and scoped to the authenticated
user's rows (a request for another user's resource returns 404, not 403, to avoid leaking
existence). Standard success/error envelope applies.

### Counterparties

| Method & path                  | Purpose                                              | Success |
|--------------------------------|------------------------------------------------------|---------|
| `POST /counterparties`         | Create a person.                                     | 201     |
| `GET /counterparties`          | List people (**paginated**), each with inline net `balance`. | 200 |
| `GET /counterparties/{id}`     | One person.                                          | 200     |
| `PATCH /counterparties/{id}`   | Edit name/note.                                      | 200     |
| `DELETE /counterparties/{id}`  | Delete — **blocked** if debts exist.                 | 204     |

### Debts

| Method & path                  | Purpose                                                        | Success |
|--------------------------------|---------------------------------------------------------------|---------|
| `POST /debts`                  | Create a debt.                                                 | 201     |
| `GET /debts`                   | List (**paginated**), filters: `counterparty_id`, `direction`, `status`. | 200 |
| `GET /debts/{id}`              | One debt incl. its repayments + derived `outstanding`/`status`.| 200     |
| `PATCH /debts/{id}`            | Edit any debt field.                                          | 200     |
| `DELETE /debts/{id}`           | Delete the debt (cascades its repayments).                    | 204     |
| `POST /debts/{id}/write-off`   | Set `written_off_at` (forgive/cancel).                        | 200     |
| `DELETE /debts/{id}/write-off` | Clear `written_off_at` (reactivate).                         | 200     |

### Repayments (nested under a debt)

| Method & path                              | Purpose                  | Success |
|--------------------------------------------|--------------------------|---------|
| `POST /debts/{id}/repayments`              | Add a repayment.         | 201     |
| `GET /debts/{id}/repayments`               | List a debt's repayments.| 200     |
| `PATCH /debts/{id}/repayments/{rid}`       | Edit a repayment.        | 200     |
| `DELETE /debts/{id}/repayments/{rid}`      | Delete a repayment.      | 204     |

### Summary

| Method & path        | Purpose                                                  | Success |
|----------------------|----------------------------------------------------------|---------|
| `GET /debts/summary` | Global net position: `totalIOwe`, `totalOwedToMe`, `net`.| 200     |

---

## Request / response contracts

JSON is **camelCase** (Pydantic alias generator); Python/DB/query-params are `snake_case`. All
**money amounts are decimal strings** (`"1500.50"`) — request amounts accept a string or number
but are validated as `> 0`, ≤ 2 decimal places, ≤ 10 integer digits (fits `NUMERIC(12,2)`).
Dates are `"YYYY-MM-DD"`. `direction` enum values are the literals **`"I_OWE"`** / **`"OWED_TO_ME"`**;
`status` is **`"open"` / `"partially_paid"` / `"settled"` / `"written_off"`**. Responses use the
standard `{ "data": ... }` envelope; paginated lists add the `pagination` block.

### Response object shapes

**Counterparty** (returned by all counterparty endpoints):
```jsonc
{
  "id": 12,
  "name": "Karim",
  "note": "neighbour",          // nullable
  "balance": "-500.00",         // signed net outstanding, excl. written-off; 0 if no debts
  "createdAt": "2026-06-30T10:00:00Z",
  "updatedAt": "2026-06-30T10:00:00Z"
}
```

**Debt (summary)** — items in `GET /debts`:
```jsonc
{
  "id": 7,
  "counterparty": { "id": 12, "name": "Karim" },   // embedded, never a flat FK id
  "direction": "I_OWE",
  "principalAmount": "1500.50",
  "outstanding": "1000.50",     // computed = principal − Σ repayments
  "status": "partially_paid",   // computed (written_off overrides)
  "description": "car repair",  // nullable
  "incurredOn": "2026-06-01",
  "writtenOffAt": null,         // date | null
  "createdAt": "...", "updatedAt": "..."
}
```

**Debt (detail)** — `GET /debts/{id}`, and the body returned by `POST /debts`, `PATCH /debts/{id}`,
and both `write-off` routes: the summary shape **plus** an embedded `repayments` array (ordered by
`paidOn`, then `id`, ascending):
```jsonc
{
  ...summary fields...,
  "repayments": [ { Repayment }, ... ]
}
```

**Repayment**:
```jsonc
{
  "id": 3,
  "amount": "500.00",
  "paidOn": "2026-06-20",
  "note": null,                 // nullable
  "createdAt": "...", "updatedAt": "..."
}
```

### Request bodies

| Endpoint                              | Body                                                                                          |
|---------------------------------------|-----------------------------------------------------------------------------------------------|
| `POST /counterparties`                | `{ name (1–100, trimmed, required), note? }`                                                   |
| `PATCH /counterparties/{id}`          | `{ name?, note? }` (at least one field)                                                        |
| `POST /debts`                         | `{ counterpartyId (req), direction (req), principalAmount (req, >0), description?, incurredOn? }` |
| `PATCH /debts/{id}`                   | `{ counterpartyId?, direction?, principalAmount?, description?, incurredOn? }`                  |
| `POST /debts/{id}/write-off`          | *(empty)* — server stamps `written_off_at = today`                                             |
| `DELETE /debts/{id}/write-off`        | *(empty)* — clears `written_off_at`                                                            |
| `POST /debts/{id}/repayments`         | `{ amount (req, >0), paidOn?, note? }`                                                         |
| `PATCH /debts/{id}/repayments/{rid}`  | `{ amount?, paidOn?, note? }` (at least one field)                                             |

- **`incurredOn` and `paidOn` default to today (UTC)** when omitted on create.
- **`counterpartyId`** on `POST`/`PATCH /debts` must reference a counterparty owned by the same
  user → else **404 `COUNTERPARTY_NOT_FOUND`**.

### Query params

- `GET /counterparties` — `?page` `?page_size` (paginated; defaults page 1 / size 20 / max 100).
- `GET /debts` — `?page` `?page_size` **+** optional filters `?counterparty_id` `?direction`
  `?status` (snake_case params; combinable, AND-ed).

### `GET /debts/summary`

```jsonc
{ "data": { "totalIOwe": "1500.50", "totalOwedToMe": "250.00", "net": "-1250.50" } }
```
All decimal strings; written-off debts excluded; `net = totalOwedToMe − totalIOwe`.

---

## Error codes (Mizan-specific, this feature)

| HTTP | Code                      | Situation                                             |
|------|---------------------------|-------------------------------------------------------|
| 409  | `COUNTERPARTY_NAME_TAKEN` | `(user_id, lower(name))` uniqueness violated.         |
| 409  | `COUNTERPARTY_HAS_DEBTS`  | Deleting a counterparty that still has debts.         |
| 404  | `COUNTERPARTY_NOT_FOUND`  | No such counterparty for this user.                   |
| 404  | `DEBT_NOT_FOUND`          | No such debt for this user.                           |
| 404  | `REPAYMENT_NOT_FOUND`     | No such repayment under this debt.                    |

(Validation/auth codes reuse the shared catalogue in `conventions.md`.)
