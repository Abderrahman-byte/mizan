# Mizan Backend — Schema

The confirmed database schema. Tables appear here **only once the user has confirmed them**;
anything not listed is still open (see `decisions.md`). Every table carries the standard
`id` (BigInteger PK), `created_at`, and `updated_at` from `IdTimestampMixin` (see
`conventions.md` §5) — those are omitted from per-table column lists below.

## `users`

Owned by the `auth` module (`app/modules/auth/models.py`). Backs authentication and identity.

| Column          | Type           | Constraints        | Notes                                      |
|-----------------|----------------|--------------------|--------------------------------------------|
| `email`         | `String(320)`  | NOT NULL, UNIQUE   | Login identifier. 320 = RFC 5321 max.      |
| `display_name`  | `String(100)`  | NOT NULL           | Human-friendly name shown in the UI.       |
| `password_hash` | `String(255)`  | NOT NULL           | bcrypt hash (via `pwdlib`). Never plaintext. |

- Uniqueness on `email` is enforced at the DB level (`uq_users_email`), per conventions.
- Email **case handling**: register normalizes to trimmed + lowercase before storage and the
  uniqueness check (decided 2026-06-30, enforced in the `auth` request schema — not in the model).
- Migration: `2570e00d751f` (`create users table`).

## `refresh_tokens`

Owned by the `auth` module (`app/modules/auth/models.py`). One row = one DB-backed refresh
session (rotation strategy in `auth.md`). Stores only the **bcrypt hash** of the opaque refresh
token, never the token itself.

| Column       | Type            | Constraints                 | Notes                                          |
|--------------|-----------------|-----------------------------|------------------------------------------------|
| `user_id`    | `BigInteger`    | NOT NULL, FK→`users.id`, idx| `ondelete=CASCADE`; index `ix_refresh_tokens_user_id`. |
| `token_hash` | `String(64)`    | NOT NULL, UNIQUE            | bcrypt hash (60 chars) of the token's `secret`. `uq_refresh_tokens_token_hash`. |
| `expires_at` | `TIMESTAMPTZ`   | NOT NULL                    | now + `REFRESH_TOKEN_TTL_DAYS` at issue time.  |
| `revoked_at` | `TIMESTAMPTZ`   | NULL                        | Set on logout / rotation; NULL = active.       |

- The client-facing token is **`"<row id>.<secret>"`**; only the bcrypt hash of `secret` is stored
  here. Because bcrypt salts each hash, `token_hash` is **not look-up-able** by value — so the `id`
  prefix lets refresh/logout load the row by PK and `verify` the secret (see `auth.md`).
- Migration: `9f3c1a2b4d5e` (`create refresh_tokens table`).

## `counterparties`

Owned by the `debts` module (`app/modules/debts/models.py`). Reusable per-user contacts the debt
ledger references. Full feature spec/rules in `docs/debts.md`.

| Column     | Type          | Constraints                            | Notes                                  |
|------------|---------------|----------------------------------------|----------------------------------------|
| `user_id`  | `BigInteger`  | NOT NULL, FK→`users.id` (CASCADE), idx | Owner. `ix_counterparties_user_id`.    |
| `name`     | `String(100)` | NOT NULL                               | Person's display name.                 |
| `note`     | `Text`        | NULL                                   | Free-form note about the person.       |

- **Case-insensitive uniqueness per user:** functional unique index `uq_counterparties_user_name`
  on `(user_id, lower(name))` — one "Karim" per user. Violation → `409 COUNTERPARTY_NAME_TAKEN`.
- Migration: `99ef2d53f976`.

## `debts`

Owned by the `debts` module. One discrete loan; `outstanding` and `status` are **derived**
(never stored — see `engine.py` / `docs/debts.md`).

| Column             | Type            | Constraints                            | Notes                                            |
|--------------------|-----------------|----------------------------------------|--------------------------------------------------|
| `user_id`          | `BigInteger`    | NOT NULL, FK→`users.id` (CASCADE), idx | Owner. `ix_debts_user_id`.                       |
| `counterparty_id`  | `BigInteger`    | NOT NULL, FK→`counterparties.id`, idx  | **No** ondelete cascade — delete is blocked in the service (FK restricts as backstop). `ix_debts_counterparty_id`. |
| `direction`        | enum `debt_direction` | NOT NULL                         | `I_OWE` \| `OWED_TO_ME` (native PG enum).        |
| `principal_amount` | `NUMERIC(12,2)` | NOT NULL, CHECK > 0                    | `ck_debts_principal_positive`. DH; no currency column. |
| `description`      | `String(255)`   | NULL                                   | What the loan was for.                           |
| `incurred_on`      | `Date`          | NOT NULL                               | When the debt was taken on (defaults to today).  |
| `written_off_at`   | `Date`          | NULL                                   | Set = forgiven/cancelled (status `written_off`, excluded from reporting). NULL = active. |

- Migration: `99ef2d53f976`.

## `repayments`

Owned by the `debts` module. Partial repayments of one debt. Over-repayment is allowed by design,
so there is no amount ceiling.

| Column     | Type            | Constraints                            | Notes                              |
|------------|-----------------|----------------------------------------|------------------------------------|
| `debt_id`  | `BigInteger`    | NOT NULL, FK→`debts.id` (CASCADE), idx | `ix_repayments_debt_id`.           |
| `amount`   | `NUMERIC(12,2)` | NOT NULL, CHECK > 0                    | `ck_repayments_amount_positive`.   |
| `paid_on`  | `Date`          | NOT NULL                               | When this repayment happened (defaults to today). |
| `note`     | `String(255)`   | NULL                                   | Optional note.                     |

- Migration: `99ef2d53f976`.

> Open: all other non-auth tables (budgeting/spending-mode tables, savings-goal tables). See
> `decisions.md`.
