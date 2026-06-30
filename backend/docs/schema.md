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

> Open: all non-auth tables. See `decisions.md`.
