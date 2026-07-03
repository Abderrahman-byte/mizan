# Mizan Backend — Decisions Log

The running record of **confirmed** backend decisions. If something isn't written here, it
isn't decided — and Claude Code must ask before assuming it.

## Confirmed

- **Stack:** FastAPI, PostgreSQL, SQLAlchemy + Alembic, Pydantic v2, loguru.
- **Architecture:** layered modules (router → service → repository → models) + optional pure
  `engine.py`. See `architecture.md` / `conventions.md`.
- **API conventions:** standard success/error envelope, versioned `/api/v1`, camelCase JSON /
  snake_case Python, 400 for validation, correlation ID header. See `conventions.md`.
- **DB hygiene:** every entity has `id` (BigInteger PK), `created_at`, `updated_at`; FKs
  indexed; uniqueness enforced at DB level; migrations only. See `conventions.md`.
- **Tooling (2026-06-29):** dependencies via `pip` + `requirements.txt` (no lockfile);
  Python 3.12. See `setup.md`.
- **Containerization (2026-06-29):** root `docker-compose.dev.yml` runs `db` (`postgres:16`) +
  `backend` (uvicorn) + `frontend` (Vite dev server); `backend/Dockerfile` (python:3.12-slim).
  Host ports remapped to avoid local clashes: db `5433→5432`, backend `8088→8000`, frontend
  `5174→5174`. Health check at `GET /api/v1/health`. See `setup.md` (frontend service detail
  in `frontend/docs/`).
- **Production compose (2026-06-29):** `docker-compose.prod.yml` is a **standalone** prod stack
  (not an override of the dev file; run `docker compose -f docker-compose.prod.yml up -d --build`).
  Single-origin reverse proxy: the `frontend` nginx is the only published port (`:80`), serving
  the built SPA and proxying `/api` → `backend:8000`; `backend` and `db` are network-internal
  (no host ports). TLS terminated externally. Backend runs `uvicorn --workers` (no reload);
  `restart: unless-stopped` + healthchecks on all services. **No insecure secret defaults**:
  `DB_PASSWORD` and `JWT_SECRET` are required (stack refuses to start if unset). See `setup.md`.
- **Env vars (2026-06-29):** DB connection as parts — `DB_HOST`, `DB_PORT`, `DB_USER`,
  `DB_PASSWORD`, `DB_NAME` (the async SQLAlchemy URL is assembled in `core/config.py`) — plus
  `LOG_LEVEL` and `JWT_SECRET`. Token TTLs are **app constants** in `core/config.py`
  (`ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`), not env vars. See `setup.md`.
- **CORS (2026-06-30):** `CORSMiddleware` added in `main.py` (outermost, so preflight is answered
  and headers reach error responses too). Allowed origins come from a new env-configurable
  `CORS_ORIGINS` (comma-separated, parsed by a `field_validator` in `core/config.py`), defaulting
  to the Vite dev origins `http://localhost:5173,http://localhost:5174`. `allow_credentials=False`
  since auth uses Bearer tokens in the `Authorization` header, not cookies (this also lets
  `allow_headers="*"` cover `Authorization`). Cross-origin only matters in local dev; prod is
  same-origin behind nginx. No new dependency (`CORSMiddleware` ships with FastAPI/Starlette). See
  `setup.md`.
- **Backend skeleton (2026-06-29):** the app skeleton is implemented (no feature modules/
  endpoints). `core/`: `config`, `responses` (Success/Error envelopes), `exceptions`
  (`APIException`), `error_handlers` (4 ordered handlers + the
  validation→400 code map), `logging` (loguru flat-JSON sink), `context` (request-id middleware +
  `X-Request-ID`), `pagination` (`PaginationParams`, `build_pagination_meta`). `db/`: `base`
  (declarative `Base` + `IdTimestampMixin`) and `session` (async engine + `get_db`). `api/`:
  `router` → `v1/router` mounted at `/api/v1`, `deps` (`DBSession`, `Pagination`). `main.py` wires
  logging, middleware, handlers, and the router. The only route is the infra liveness probe
  `GET /api/v1/health`. `core/security.py` and `permissions.py` are deferred until auth. See
  `architecture.md` / `conventions.md`.
- **Migrations (2026-06-29):** Alembic is initialized (`backend/alembic.ini`,
  `app/alembic/` with async `env.py` reading `settings.database_url` and `Base.metadata` from
  `app/db/base.py`). Both compose files run `alembic upgrade head` before the server starts. No
  migration revisions exist yet (schema undecided), so it is currently a no-op. See `setup.md`.
- **Auth mechanism (2026-06-29, build deferred):** JWT **Bearer** tokens (frontend stores in
  localStorage + Axios interceptor); **access** (~15 min) + **refresh** (~30 d) tokens with a
  refresh endpoint; passwords hashed with **bcrypt via `pwdlib`**. Endpoint surface, reset-token
  storage, and email delivery remain OPEN below.
- **Refresh-token strategy (2026-06-30, build deferred):** **DB-backed refresh sessions with
  rotation** — a `refresh_tokens` table stores a hashed token per session; refresh rotates it and
  logout revokes it (enables true server-side logout/revocation). Table shape and the rotation
  flow are built with the auth endpoints, not yet. See `docs/auth.md`.
- **JWT codec library (2026-06-30):** **PyJWT** (lightweight, JWT-focused). To be added to
  `requirements.txt` when token-encoding code lands. `pwdlib[bcrypt]` likewise pending the
  hashing code. See `docs/auth.md`.
- **Router location (2026-06-30):** **all routers live under `app/api/`** (route handlers at
  `app/api/v1/<resource>.py`), never inside `app/modules/<feature>/`. Feature modules hold only
  the non-routing layers (`models`, `schemas`, `repository`, `service`, `engine?`, `enums`,
  `exceptions`). This matches the directory layout in `conventions.md` / `architecture.md`.
- **Auth endpoint set (2026-06-30, stubbed):** six endpoints under `/api/v1/auth` —
  `POST register`, `POST login`, `POST refresh`, `POST logout`, `POST forgot-password`,
  `POST reset-password` — scaffolded in `app/api/v1/auth.py` and mounted in `api/v1/router.py`.
  All handlers are **stubs returning `501 NOT_IMPLEMENTED`**; their payloads, response shapes, and
  logic stay OPEN. `NOT_IMPLEMENTED` is a temporary stub code, not a catalogue entry. See
  `docs/auth.md`.
- **`GET /api/v1/auth/me` contract (2026-06-30, implemented):** a 7th auth route (added on
  request) returning the authenticated user's profile. Requires `Authorization: Bearer
  <access-token>`, no body; success **200** with the user fields **directly under `data`** (no
  wrapper) reusing `UserResponse`. No service layer — the auth dependency resolves the principal
  and the router maps ORM→schema. See `docs/auth.md`.
- **Bearer-token auth dependency (2026-06-30, implemented):** `get_current_user` in
  `app/api/deps.py` (exposed as `CurrentUser`) is the **shared** guard for every protected route.
  Extracts the token via `HTTPBearer(auto_error=False)`, validates it with
  `security.decode_access_token` (HS256 sig + `exp` + `type=="access"`, returns `sub`), then loads
  the user. **PyJWT stays encapsulated in `core/security.py`**, which raises codec-neutral
  `AccessTokenExpired` / `AccessTokenInvalid`; the dependency maps these to **401
  `AUTH_TOKEN_EXPIRED`** (expired — client refreshes) and **401 `AUTH_TOKEN_INVALID`**
  (missing/malformed/badly-signed/wrong-type, or vanished user — client re-logs-in). See
  `docs/auth.md`.
- **`users` table (2026-06-30):** the `User` entity has columns `id`, `created_at`, `updated_at`
  (mixin) + `email` `String(320)` **unique**, `display_name` `String(100)`, `password_hash`
  `String(255)` — all NOT NULL. First migration `2570e00d751f` (`create users table`) created and
  verified (upgrade/downgrade roundtrip, `alembic check` clean). Email case-handling and the
  signup payload are decided with the auth services. See `docs/auth.md` and `docs/schema.md`.
- **Auth/users module consolidation (2026-06-30):** the `users` module was **merged into `auth`**
  — there is no separate `users` module. The `auth` module (`app/modules/auth/`) owns **both** the
  `User` identity entity and the `RefreshToken` session entity (both in `models.py`), plus all auth
  flow layers (schemas/repository/service/exceptions). Table names (`users`, `refresh_tokens`) are
  unchanged, so no migration is affected. Routes stay in `app/api/v1/auth.py`. Supersedes the
  earlier "separate `users` module" note.
- **`refresh_tokens` table (2026-06-30):** owned by the new `auth` module
  (`app/modules/auth/models.py`). Columns: `id`/`created_at`/`updated_at` (mixin) + `user_id`
  `BigInteger` FK→`users.id` (`ondelete=CASCADE`, indexed), `token_hash` `String(64)` **unique**
  NOT NULL, `expires_at` `TIMESTAMPTZ` NOT NULL, `revoked_at` `TIMESTAMPTZ` nullable. Migration
  `9f3c1a2b4d5e` (`create refresh_tokens table`). One row = one refresh session. See `docs/schema.md`.
- **Refresh-token format & hashing (2026-06-30):** the refresh token handed to the client is
  **`"<row_id>.<secret>"`**, where `secret` is a high-entropy opaque string
  (`secrets.token_urlsafe(32)`); only the **bcrypt hash of `secret`** (via `pwdlib`) is stored in
  `token_hash`. Because bcrypt salts every hash a stored hash is **not look-up-able** by value, so
  the `row_id` prefix makes the session directly addressable: `/refresh` and `/logout`
  `parse_refresh_token` the value, load that one row by PK, and `verify` the secret (O(1), no
  candidate scan). Helpers in `app/core/security.py`. See `docs/auth.md`.
- **Access-token format (2026-06-30):** **HS256 JWT** signed with `JWT_SECRET`, claims
  `sub`=str(user_id), `iat`, `exp` (now + `ACCESS_TOKEN_TTL_MINUTES`), `type="access"`. Codec
  `PyJWT`; password/refresh hashing `pwdlib[bcrypt]` — both now added to `requirements.txt`.
  Implemented in `app/core/security.py`. See `docs/auth.md`.
- **`POST /api/v1/auth/register` contract (2026-06-30, implemented):** request
  `{email, displayName, password}`; email normalized (trim + lowercase); `displayName` 1–100
  chars (trimmed); password 8–128 chars, no complexity rule. On success returns **201** with
  `{data: {user: {id, email, displayName, createdAt}, accessToken, refreshToken}}` (auto-login:
  creates a `refresh_tokens` session). Duplicate email → **409 `EMAIL_TAKEN`** (pre-checked, with
  the DB unique constraint as a race backstop). Built end-to-end (router → service → repository →
  models) per the layering rule. See `docs/auth.md`.
- **`POST /api/v1/auth/login` contract (2026-06-30, implemented):** request `{email, password}`;
  email normalized (trim + lowercase) to match the stored identity, **no** format/length
  validation on the login path. On success returns **200** with the **same body as register**
  (`{data: {user, accessToken, refreshToken}}`), opening a new `refresh_tokens` session. An
  unknown email and a wrong password both return **401 `INVALID_CREDENTIALS`** (single generic
  message — no account enumeration; verified via `security.verify_password`). Built router →
  service (`login`, sharing the `_open_session` token helper with `register`) → repository. See
  `docs/auth.md`.
- **`POST /api/v1/auth/refresh` contract (2026-06-30, implemented):** request `{refreshToken}`
  (the `"<id>.<secret>"` value); no access token. The server loads session row `id` by PK and
  verifies `secret`. On success returns **200** with the **rotated pair only**
  `{data: {accessToken, refreshToken}}` — the presented session is revoked (`revoked_at`) and a
  fresh one issued, so a replayed token is rejected. Errors: **401 `REFRESH_TOKEN_INVALID`**
  (malformed / unknown / mismatched / already-revoked) and **401 `REFRESH_TOKEN_EXPIRED`** (past
  `expires_at`); client re-logs-in on either. Built router → `service.refresh`
  (`_resolve_refresh_session` + `_open_session`) → repository. See `docs/auth.md`.
- **`POST /api/v1/auth/logout` contract (2026-06-30, implemented):** request `{refreshToken}`; no
  access token. Revokes **just that one session** (`revoked_at`); returns **204 No Content**. Same
  error resolution as refresh (`REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_EXPIRED`). Built router →
  `service.logout` (shares `_resolve_refresh_session`) → repository. See `docs/auth.md`.
- **Debt/loan ledger (2026-06-30 design; implemented 2026-07-01):** the full feature is built and
  verified end-to-end against the running stack. `debts` module (`app/modules/debts/`:
  `enums`/`models`/`schemas`/`repository`/`service`/`engine`/`exceptions`), routes in
  `app/api/v1/counterparties.py` + `app/api/v1/debts.py`, migration `99ef2d53f976` (tables in
  `docs/schema.md`; `alembic check` clean, upgrade/downgrade roundtrip verified). Added a shared
  `PaginatedResponse[T]` envelope to `core/responses.py` (the first paginated list endpoints).
  Full spec in `docs/debts.md`. Key decisions:
  - **Model:** discrete `debts` (principal + `direction` `I_OWE`/`OWED_TO_ME`) with child
    `repayments`; `outstanding = principal − Σ repayments` (derived, never stored).
  - **Counterparties:** reusable per-user `counterparties` table; name **unique per user**
    (`(user_id, lower(name))`) → **409 `COUNTERPARTY_NAME_TAKEN`**.
  - **Standalone:** no link to spending modes / budget in v1.
  - **Status:** derived `open`/`partially_paid`/`settled` (`settled` = `outstanding <= 0`) **+**
    stored `written_off_at DATE` for forgiven/cancelled debts (status `written_off`, excluded from
    reporting).
  - **Over-repayment allowed** — outstanding may go negative; no exceed error.
  - **Debt fields fully editable** anytime; **repayments fully mutable** (POST/GET/PATCH/DELETE).
  - **Counterparty delete blocked** while debts reference it → **409 `COUNTERPARTY_HAS_DEBTS`**.
  - **Reporting (derived):** per-person `balance` inline on `GET /counterparties`; global
    `GET /debts/summary` → `totalIOwe`/`totalOwedToMe`/`net`.
  - **Money** `NUMERIC(12,2)` (DH only, no currency column); dates as `DATE`.
  - **Error codes:** `COUNTERPARTY_NAME_TAKEN`, `COUNTERPARTY_HAS_DEBTS` (409);
    `COUNTERPARTY_NOT_FOUND`, `DEBT_NOT_FOUND`, `REPAYMENT_NOT_FOUND` (404).
  - **Contracts (2026-06-30):** `GET /debts` and `GET /counterparties` **paginate**
    (`?page`/`?page_size`); repayments return as a full list (embedded in debt detail). All
    **money amounts are decimal strings** (`"1500.50"`), not JSON numbers. `GET /debts` list items
    are **summary** shape (debt fields + embedded `counterparty {id,name}` + computed
    `outstanding`/`status`); `repayments[]` appears only in `GET /debts/{id}` detail. `direction`
    serialized as `"I_OWE"`/`"OWED_TO_ME"`; `status` as `open`/`partially_paid`/`settled`/`written_off`.
    `incurredOn`/`paidOn` default to today when omitted. Full per-endpoint field lists in
    `docs/debts.md`.
  - See `docs/debts.md` and `docs/schema.md`.
- **Debt-ledger export/import (2026-07-03, implemented & verified):** two new routes —
  `GET /debts/export` (200) and `POST /debts/import` (201) — moving the whole ledger as a
  portable **`mizan-debts` v1 JSON document** (nested counterparties → debts → repayments; no
  DB ids; money as decimal strings). Chosen over CSV. Export includes **everything** (debt-less
  counterparties, written-off/settled debts, full repayment history); derived fields are
  recomputed on import. Import is **merge** semantics: atomic (single transaction),
  counterparties matched case-insensitively by name (matched ones keep their existing note),
  every debt in the file created (re-import duplicates debts — accepted trade-off), nothing
  modified/deleted; responds with created/matched counts. The document is deliberately **one
  schema for both directions** (documented exception to the separate request/response rule —
  it is the file format). New error code **400 `UNSUPPORTED_EXPORT_VERSION`**; wrong `format`
  literal / duplicate in-file names → 400 `VALIDATION_ERROR`. UI lives on the People screen
  (client-side blob download + file picker; frontend `docs/decisions.md`). Full contract in
  `docs/debts.md`.
- **Deployment (2026-07-03):** single VPS running the prod compose stack, fronted by a **host
  nginx** (not containerized) that terminates TLS — config in `deploy/nginx/mizan.conf`. Domain
  **`mizan.abderrahmane.ma`** behind the **Cloudflare proxy** (orange cloud); TLS uses a
  **Cloudflare Origin CA certificate** (15-year, dashboard-generated, `/etc/ssl/cloudflare/`),
  zone SSL mode **Full (strict)**; real client IPs restored from `CF-Connecting-IP`. The
  `frontend` service now publishes **`127.0.0.1:8080`** only (was `:80`) — the host nginx is the
  sole public listener (80 → 443 redirect). Considered and rejected: Caddy (its auto-ACME
  advantage is lost behind the Cloudflare proxy) and terminating TLS inside the frontend
  container. See `docs/setup.md` → "Running in production".

## OPEN — must be decided with the user before implementing

> Do **not** invent any of the following. Ask, then record the answer here.

### Database schema
- The `users` and `refresh_tokens` tables are **decided** (see Confirmed above; `docs/schema.md`).
- The **debt-ledger tables** (`counterparties`, `debts`, `repayments`) are **built and migrated**
  (`99ef2d53f976`; see Confirmed above; `docs/schema.md`).
- The **budgeting/spending-mode** and **savings-goal** tables remain undecided.

### API endpoints
- The **auth endpoint set** (7 routes under `/api/v1/auth`, incl. `GET me`) is decided;
  **`register`, `login`, `me`, `refresh`, and `logout` are fully implemented** (contracts in
  Confirmed above; the shared Bearer-token auth dependency is built). Only **`forgot-password` /
  `reset-password`** remain undecided (payload, response shape, success status, error codes).
- The **debt-ledger endpoint surface** (counterparties, debts, repayments, summary,
  export/import — 19 routes) is **fully implemented** (request/response field lists, pagination, money serialization, filters,
  write-off, error codes; see `docs/debts.md`).
- All other non-auth routes (budgeting, savings) remain entirely undecided.

### Auth (remaining open items)
- Mechanism, token strategy/format, refresh strategy, JWT lib, the `users`/`refresh_tokens`
  columns, the endpoint **set**, the **`register`/`login`/`me`/`refresh`/`logout` contracts**, and
  the **shared Bearer-token auth dependency** are **decided** (see Confirmed above). Still open: the
  `forgot-password` / `reset-password` request/response contracts, reset-token storage (table vs.
  signed token), and password-reset email delivery.

### Domain rules
- How a month is classified into a spending mode (formula/thresholds).
- ~~How the debt/loan ledger represents owed vs. lent.~~ **Decided** — see the debt-ledger entry
  in Confirmed above and `docs/debts.md`.
- Savings-goal tracking rules.
- Any further business-rule error codes (`<RULE>_VIOLATION`) for budgeting/savings (the debt
  ledger's codes are recorded in `docs/debts.md`).

### Project specifics to fill into conventions.md
- Final module list.
- Project-specific error-code catalogue entries.
- Pagination defaults if they differ from the generic template.

---

### How to use this file
This log is the source of truth for backend decisions. Whenever a decision is made:
1. Move it from **OPEN** to **Confirmed** here with a one-line note and the date.
2. Update every doc the decision touches (and create + link a new doc if it needs one) — see the
   root `CLAUDE.md` → "Documentation is part of the work."
3. Resolve any related `# TODO: confirm` markers in the code and docs.
Keep entries short and factual. A decision that isn't written here doesn't exist.
