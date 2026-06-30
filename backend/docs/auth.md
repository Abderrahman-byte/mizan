# Mizan Backend — Auth

How authentication works in Mizan. This file records **confirmed** auth decisions and tracks
what is still open. Build is incremental: the `User` model lands first, the endpoints and token
code follow once their open items are decided.

## Confirmed

### Mechanism
- **JWT Bearer tokens.** Frontend stores them in `localStorage` and attaches them via an Axios
  interceptor (see `frontend/docs/`).
- **Two tokens:** a short-lived **access** token (`ACCESS_TOKEN_TTL_MINUTES = 15`) and a
  long-lived **refresh** token (`REFRESH_TOKEN_TTL_DAYS = 30`). TTLs are app constants in
  `app/core/config.py`, not env vars.
- **Signing secret:** `JWT_SECRET` (env var; required in production).
- **JWT codec:** **PyJWT** (in `requirements.txt`). Access token = **HS256**, claims
  `sub`=str(user_id), `iat`, `exp` (now + `ACCESS_TOKEN_TTL_MINUTES`), `type="access"`. Built in
  `app/core/security.py` (`create_access_token`).

### Passwords
- Hashed with **bcrypt via `pwdlib`** (`pwdlib[bcrypt]`, now in `requirements.txt`). Plaintext
  passwords are never stored or logged. Hash lives in `users.password_hash`. Helpers
  `hash_password` / `verify_password` in `app/core/security.py` (bcrypt's 72-byte limit is handled
  by truncating the input).

### Refresh strategy — DB-backed sessions with rotation
- The `refresh_tokens` table stores a **bcrypt-hashed** refresh secret per session (columns in
  `schema.md`). The client-facing token has the form **`"<row_id>.<secret>"`** where `secret` is a
  `secrets.token_urlsafe(32)` opaque string; only the bcrypt hash of `secret` is persisted. Helpers
  `generate_refresh_token` (secret) / `format_refresh_token` / `parse_refresh_token` /
  `hash_refresh_token` / `verify_refresh_token` live in `app/core/security.py`.
- ⚠️ **Lookup consequence of bcrypt:** because bcrypt salts each hash, you **cannot** find a session
  by `WHERE token_hash = ?`. The `row_id` prefix solves this: `/refresh` and `/logout`
  `parse_refresh_token` the supplied value, load **that one row by primary key**, then
  `verify_refresh_token` the `secret` against its stored hash (O(1) — no candidate scan). Register
  only *inserts*, so it is unaffected.
- Refreshing **rotates** the token (old row's `revoked_at` set, a new session issued); logout
  **revokes** the presented session row (`revoked_at`) → true server-side logout / revocation. A
  revoked row is kept (not deleted), so replaying a rotated/logged-out token is rejected as
  `REFRESH_TOKEN_INVALID`. Built end-to-end (2026-06-30) — see the `refresh`/`logout` contracts below.

### Identity model — `users` table
- Owned by the `auth` module. Columns: `email` (unique login id), `display_name`,
  `password_hash`, plus the standard `id`/`created_at`/`updated_at`. Full shape in `schema.md`.
- The `User` entity lives in `app/modules/auth/models.py` alongside `RefreshToken`. The **auth
  flow logic** (schemas, repository, service for register/login/refresh/logout) lives in the same
  `app/modules/auth/` module; its **routes** live in `app/api/v1/auth.py` (routers are never
  inside module folders).

## Endpoints

The endpoint **set** is confirmed (2026-06-30), mounted at `/api/v1/auth` (routers live under
`app/api/`, per the router-location decision). The original six were joined by `me` (added
2026-06-30 on request). `register`, `login`, `me`, `refresh`, and `logout` are **implemented**;
`forgot-password` / `reset-password` are **stubs** returning `501 NOT_IMPLEMENTED` until their
contracts are designed.

| Method & path                    | Purpose                                          | Status |
|----------------------------------|--------------------------------------------------|--------|
| `POST /api/v1/auth/register`        | Create a new user account (auto-login).       | ✅ implemented |
| `POST /api/v1/auth/login`           | Authenticate; issue access + refresh tokens.  | ✅ implemented |
| `POST /api/v1/auth/refresh`         | Rotate refresh token; issue new access token. | ✅ implemented |
| `POST /api/v1/auth/logout`          | Revoke the presented refresh session.         | ✅ implemented |
| `GET /api/v1/auth/me`               | Return the authenticated user's profile.      | ✅ implemented |
| `POST /api/v1/auth/forgot-password` | Issue a reset token and email it.             | stub (501) |
| `POST /api/v1/auth/reset-password`  | Validate reset token; set a new password.     | stub (501) |

> `NOT_IMPLEMENTED` (501) is a temporary stub signal, not part of the status table in
> `conventions.md` — it disappears as each endpoint is built.

### `POST /api/v1/auth/register` — contract (confirmed 2026-06-30)

**Request** (camelCase JSON):

```json
{ "email": "ali@example.com", "displayName": "Ali", "password": "correcthorse" }
```

- `email` — normalized to **trimmed + lowercase**; pragmatic format check (no `email-validator`
  dependency); ≤ 320 chars.
- `displayName` — trimmed, 1–100 chars, must not be blank.
- `password` — 8–128 chars, **no** complexity requirement.

**Success — `201 Created`** (auto-login: also opens a `refresh_tokens` session):

```json
{
  "data": {
    "user": { "id": 1, "email": "ali@example.com", "displayName": "Ali", "createdAt": "2026-06-30T12:00:00Z" },
    "accessToken": "<hs256-jwt>",
    "refreshToken": "<opaque-token>"
  }
}
```

**Errors:** `409 EMAIL_TAKEN` (duplicate email — pre-checked, with the DB unique constraint as a
race backstop); `400 VALIDATION_ERROR` for payload violations (standard envelope).

Layering: `app/api/v1/auth.py` (router) → `app/modules/auth/service.py` → `repository.py` →
`models.py` (`User` and `RefreshToken`, both owned by the `auth` module). Hashing/JWT via
`app/core/security.py`.

### `POST /api/v1/auth/login` — contract (confirmed 2026-06-30)

**Request** (camelCase JSON):

```json
{ "email": "ali@example.com", "password": "correcthorse" }
```

- `email` — normalized to **trimmed + lowercase** to match the stored identity. No format or
  length validation is applied (unlike register): a malformed value simply won't match a row.
- `password` — taken as-is; no length/complexity check on the login path.

> Login validates **closed**: any bad input (unknown email, wrong password, malformed email)
> resolves to `401 INVALID_CREDENTIALS`, never a `400` — so the error never reveals which field
> was wrong or whether the account exists.

**Success — `200 OK`** (opens a new `refresh_tokens` session — same body as register):

```json
{
  "data": {
    "user": { "id": 1, "email": "ali@example.com", "displayName": "Ali", "createdAt": "2026-06-30T12:00:00Z" },
    "accessToken": "<hs256-jwt>",
    "refreshToken": "<opaque-token>"
  }
}
```

**Errors:** `401 INVALID_CREDENTIALS` — single generic error for both an unknown email and a
wrong password (no account enumeration; verified with `security.verify_password`).

Layering: `app/api/v1/auth.py` (router) → `app/modules/auth/service.py` (`login`, sharing the
`_open_session` token-issuance helper with `register`) → `repository.py` → `models.py`.

### `GET /api/v1/auth/me` — contract (confirmed 2026-06-30)

The first **protected** route. Requires `Authorization: Bearer <access-token>`; no request body.

**Success — `200 OK`** (user fields directly under `data`, no wrapper object):

```json
{
  "data": { "id": 1, "email": "ali@example.com", "displayName": "Ali", "createdAt": "2026-06-30T12:00:00Z" }
}
```

**Errors:** `401 AUTH_TOKEN_EXPIRED` (access token past `exp`) and `401 AUTH_TOKEN_INVALID`
(missing/malformed/badly-signed/wrong-`type` token, or one whose user no longer exists). The
client refreshes on `AUTH_TOKEN_EXPIRED` and re-logs-in on `AUTH_TOKEN_INVALID`.

The route has no service layer: the `get_current_user` dependency resolves the principal and the
router maps the ORM `User` → `UserResponse` (allowed schema⇄ORM mapping).

### `POST /api/v1/auth/refresh` — contract (confirmed 2026-06-30)

**Request** (camelCase JSON) — the `refreshToken` last issued by register/login/refresh:

```json
{ "refreshToken": "42.Xy3...opaque" }
```

The token is `"<row_id>.<secret>"`; the server splits it, loads session row `42` by PK, and
verifies `secret` against the stored bcrypt hash. No access token required.

**Success — `200 OK`** (rotation: the presented session is revoked and a fresh one issued — the
**rotated pair only**, no `user` object):

```json
{ "data": { "accessToken": "<hs256-jwt>", "refreshToken": "<new-id.secret>" } }
```

**Errors:** `401 REFRESH_TOKEN_INVALID` (malformed, unknown id, secret mismatch, or an
already-revoked session — including a replayed/rotated token); `401 REFRESH_TOKEN_EXPIRED`
(session past `expires_at`). The client re-logs-in on either.

Layering: `app/api/v1/auth.py` (router) → `service.refresh` (resolves the live session via the
shared `_resolve_refresh_session`, revokes it, then reuses `_open_session`) → `repository`
(`get_refresh_token_by_id` / `revoke_refresh_token` / `create_refresh_token`) → `models`.

### `POST /api/v1/auth/logout` — contract (confirmed 2026-06-30)

**Request** (camelCase JSON):

```json
{ "refreshToken": "42.Xy3...opaque" }
```

Revokes **just that one session** (sets `revoked_at`); other sessions for the user stay active.
No access token required.

**Success — `204 No Content`** (empty body).

**Errors:** same resolution as `refresh` — `401 REFRESH_TOKEN_INVALID` (malformed / unknown /
mismatched / already-revoked) and `401 REFRESH_TOKEN_EXPIRED` (past `expires_at`).

Layering: `app/api/v1/auth.py` (router) → `service.logout` (shares `_resolve_refresh_session`
with `refresh`, then revokes) → `repository` → `models`.

### The Bearer-token auth dependency (confirmed 2026-06-30)

`get_current_user` in `app/api/deps.py` is the **shared** dependency for every protected route,
exposed as the `CurrentUser` annotated type. Flow:

1. Extract the token via FastAPI's `HTTPBearer(auto_error=False)` — a missing/blank header raises
   `AUTH_TOKEN_INVALID` through our standard error envelope (not FastAPI's default 403 body).
2. `security.decode_access_token(token)` validates the HS256 signature, `exp`, and `type=="access"`
   and returns `sub` as the `user_id`. PyJWT is fully **encapsulated** in `core/security.py`: it
   raises the codec-neutral `AccessTokenExpired` / `AccessTokenInvalid`, which the dependency maps
   to `AUTH_TOKEN_EXPIRED` / `AUTH_TOKEN_INVALID`. The API layer never imports `jwt`.
3. Load the user (`repository.get_user_by_id`); a vanished user → `AUTH_TOKEN_INVALID`.

### Auth error codes

| HTTP | Code                  | Situation                                       |
|------|-----------------------|-------------------------------------------------|
| 409  | `EMAIL_TAKEN`         | Registering with an email that already exists.  |
| 401  | `INVALID_CREDENTIALS` | Login with an unknown email or a wrong password.|
| 401  | `AUTH_TOKEN_EXPIRED`  | Protected route: the Bearer access token is expired. |
| 401  | `AUTH_TOKEN_INVALID`  | Protected route: Bearer token missing/malformed/badly-signed/wrong-type, or its user is gone. |
| 401  | `REFRESH_TOKEN_INVALID` | `/refresh` or `/logout`: refresh token malformed, unknown, secret mismatch, or already revoked. |
| 401  | `REFRESH_TOKEN_EXPIRED` | `/refresh` or `/logout`: the session row is past `expires_at`. |

> More codes are added here as the remaining endpoints are built.

## Open — decide before building

- **Per-endpoint contract** for `forgot-password` / `reset-password`: request payload (fields +
  validation), response shape, success status, and error codes — none decided. They must follow
  the envelope/status conventions in `conventions.md` §2 once designed. (`register`, `login`, `me`,
  `refresh`, and `logout` are decided — see their contracts above; the shared Bearer-token auth
  dependency is built.)
- **Password reset:** reset-token storage (dedicated table vs. signed stateless token) and email
  delivery (provider, templates).

## Build status

| Piece                         | Status                                  |
|-------------------------------|-----------------------------------------|
| `users` model + migration     | ✅ done (`2570e00d751f`)                |
| `auth` router + endpoint stubs | ✅ done (`register`/`login`/`me`/`refresh`/`logout` live; `forgot`/`reset` return 501) |
| `core/security.py` (hashing/JWT) | ✅ done (password + refresh bcrypt, `id.secret` token format, HS256 access JWT) |
| `register` schemas + service/repository | ✅ done (contract above) |
| `login` schemas + service     | ✅ done (contract above; reuses register's repository + `_open_session`) |
| `refresh_tokens` table        | ✅ done (`9f3c1a2b4d5e`)                |
| `refresh` / `logout` contracts + logic | ✅ done (rotation + revoke; `REFRESH_TOKEN_INVALID`/`REFRESH_TOKEN_EXPIRED`) |
| `me` endpoint + Bearer-token auth dependency | ✅ done (`get_current_user` / `CurrentUser`; `AUTH_TOKEN_EXPIRED`/`AUTH_TOKEN_INVALID`) |
| Password reset                | ⬜ deferred (storage + email open)      |
