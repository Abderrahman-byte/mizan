# Mizan Backend — Setup

How to run the backend locally and via Docker.

> Values marked `# TODO: confirm` are not yet decided — ask the user before filling them.

## Prerequisites

- Docker + docker-compose (primary path)
- Python 3.12+ and PostgreSQL 16+ (only if running outside Docker)

## Environment variables

Centralized in `core/config.py` via Pydantic `BaseSettings`, accessed through a module-level
`settings = Settings()` instance (not `@lru_cache` + getter). Provide a `.env.example` and keep
real `.env` out of version control.

Expected keys (names to confirm with the user):

```
DATABASE_URL=postgresql+asyncpg://...     # async driver for SQLAlchemy
JWT_SECRET=...                            # if/when auth is confirmed
LOG_LEVEL=INFO
# TODO: confirm full env var list once auth + config decisions are made
```

Constants that are *not* env-configurable (formulas, intervals, TTLs) are plain module-level
constants — never `BaseSettings` fields, never magic numbers scattered in code.

## Running with Docker

```bash
docker compose up --build      # starts db + backend (+ frontend)
```

The backend container should run migrations then start uvicorn. Exact command lives in the
backend Dockerfile / compose service — confirm the startup command with the user if changing it.

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
