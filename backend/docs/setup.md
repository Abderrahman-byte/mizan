# Mizan Backend — Setup

How to run the backend locally and via Docker.

> Values marked `# TODO: confirm` are not yet decided — ask the user before filling them.

## Prerequisites

- Docker + docker-compose (primary path)
- Python 3.12+ and PostgreSQL 16+ (only if running outside Docker)

## Environment variables

Centralized in `core/config.py` via Pydantic `BaseSettings`, accessed through a module-level
`settings = Settings()` instance (not `@lru_cache` + getter).

**One env file: the repo-root `./.env`** (template: `./.env.example`). Docker Compose
auto-loads it and injects the values into the containers; `config.py` reads them from the
process environment. There is **no** `backend/.env`. All keys have defaults in
`docker-compose.dev.yml`, so `./.env` is optional — use it to override (e.g. a real `JWT_SECRET`).
Keep the real `.env` out of version control (already gitignored).

Keys (confirmed 2026-06-29):

```
# DB connection parts — the async SQLAlchemy URL is assembled in core/config.py.
DB_HOST=db                               # in-network host (the db service)
DB_PORT=5432                             # in-network port (not the remapped host port)
DB_USER=mizan
DB_PASSWORD=mizan
DB_NAME=mizan
LOG_LEVEL=INFO
JWT_SECRET=change-me                     # placeholder; required (no default) in prod
```

Token TTLs are **not** env vars — they are app constants in `app/core/config.py`
(`ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`), per the convention that intervals/TTLs
are module-level constants, not `BaseSettings` fields.

Constants that are *not* env-configurable (formulas, intervals, TTLs) are plain module-level
constants — never `BaseSettings` fields, never magic numbers scattered in code.

## Running with Docker (primary path)

```bash
docker compose -f docker-compose.dev.yml up --build   # db + backend + frontend, hot reload
```

- Backend: <http://localhost:8088> — health check at `GET /api/v1/health` → `{"data":{"status":"ok"}}`.
- Postgres: host port **5433** (container 5432). Host ports are remapped (5433, 8088) to avoid
  clashing with services commonly already bound to 5432/8000.
- Source is bind-mounted with `--reload` for live dev.

The backend startup command runs `alembic upgrade head` before uvicorn (same in prod). There
are no migration revisions yet — the schema is undecided — so the upgrade is currently a no-op.

Dependencies are installed with `pip install -r requirements.txt` (no lockfile, by decision).

## Running in production

```bash
DB_PASSWORD=... JWT_SECRET=... \
  docker compose -f docker-compose.prod.yml up -d --build
```

`docker-compose.prod.yml` is a **standalone** production stack (not an override of the dev file):

- **Single entry point:** the `frontend` nginx publishes `:80` only — it serves the built SPA
  and proxies `/api` → `backend:8000`. The backend and db have **no published host ports**
  (network-internal). TLS is terminated externally (cloud LB / ingress) in front of `:80`.
- **Backend:** `uvicorn --workers 4` (no `--reload`), code baked into the image (no bind mount),
  `restart: unless-stopped`, healthcheck on `/api/v1/health`.
- **Secrets:** `DB_PASSWORD` and `JWT_SECRET` are **required** — provide them via the
  environment or root `./.env`; the stack refuses to start if unset (no dev fallback values).
- **Caveat:** this makes the *deployment* production-grade, but the app itself is not
  production-functional yet (skeleton backend, no migrations/auth; frontend on mock data).

### Troubleshooting

- **`password authentication failed for user "..."` / backend unhealthy after changing
  `DB_PASSWORD`:** Postgres only applies `POSTGRES_PASSWORD`/`POSTGRES_USER`/`POSTGRES_DB` when
  it *first* initializes an empty data dir. An existing `mizan-db-data` volume keeps its original
  credentials, so a changed `DB_PASSWORD` won't match. Fix (destroys DB data — fine while there's
  no real schema): `docker compose -f docker-compose.prod.yml down -v` then `up --build`.
- **Dev and prod share the default project name `mizan`** (and the same `mizan-db-data` volume),
  so running one recreates the other's containers. To keep them independent, give each its own
  project: `docker compose -p mizan-dev -f docker-compose.dev.yml ...` and
  `docker compose -p mizan-prod -f docker-compose.prod.yml ...`.

## Migrations (Alembic)

- All schema changes go through Alembic. Never alter tables by hand.
- Always write `downgrade()`.
- Do **not** autogenerate migrations against an invented schema — migrations follow confirmed
  models only.

```bash
# inside the backend container
alembic revision --autogenerate -m "describe change"
alembic upgrade head
alembic downgrade -1
```

## Running the app (outside Docker)

```bash
uvicorn app.main:app --reload
```

Interactive docs at `/docs` once the app is running.

## Local checks before committing

- App imports and starts.
- Migrations apply cleanly up and down.
- Pure logic in `engine.py` has unit tests (no DB needed).
- No business logic leaked into routers; no DB queries outside repositories.
