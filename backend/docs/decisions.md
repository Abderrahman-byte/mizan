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
  refresh endpoint; passwords hashed with **bcrypt via `pwdlib`**. Endpoint surface, signup
  fields, reset-token storage, and email delivery remain OPEN below.

## OPEN — must be decided with the user before implementing

> Do **not** invent any of the following. Ask, then record the answer here.

### Database schema
- All tables, columns, types, and relationships. **Nothing about the schema is decided.**

### API endpoints
- All routes, path/query params, request payloads, and response shapes. **No endpoint is
  decided.**

### Auth (remaining open items)
- Mechanism/token strategy are **decided** (see Confirmed above). Still open: the endpoint
  surface (register/login/refresh/logout/me/forgot/reset), signup field set, `users` table
  columns, reset-token storage (table vs. signed token), and password-reset email delivery.

### Domain rules
- How a month is classified into a spending mode (formula/thresholds).
- How the debt/loan ledger represents owed vs. lent.
- Savings-goal tracking rules.
- Any business-rule error codes (`<RULE>_VIOLATION`).

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
