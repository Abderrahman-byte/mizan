# Mizan Backend — Architecture

Companion to `conventions.md`. This file explains the layered module pattern and where each
kind of code lives. `conventions.md` is the authoritative source for the rules; this is the
orientation.

> Reminder: schema and endpoints are **not decided**. The structure below is the skeleton we
> fill *after* the user confirms each feature.

## The four layers

Each layer may only call the one below it. This is the backbone of the codebase.

```
router  → routing, dependency injection, schema ⇄ ORM mapping
service → business logic; orchestrates repositories
repository → async DB queries only
models  → SQLAlchemy ORM classes
```

Pure computation (formulas, decision logic such as classifying a month into a spending mode)
lives in a module-local `engine.py` as **pure functions** — no DB, no I/O — so it's trivially
unit-testable. Services call the engine, then persist results via repositories.

## Why this matters for Mizan

The "which mode is this month" decision and any budget math are exactly the kind of pure logic
that belongs in `engine.py`, isolated from persistence. Keep it there so it can be tested
without a database and reused across endpoints.

> The *specific* formulas and thresholds are an open decision — do not hardcode them until the
> user confirms the rules. Mark placeholders with `# TODO: confirm before implementing`.

## Directory layout (target)

```
app/
├── main.py                  # app init, router registration, lifespan, exception wiring
├── api/
│   ├── router.py            # mounts /api
│   ├── deps.py              # shared deps: DB session, auth, pagination
│   └── v1/
│       ├── router.py        # mounts /v1
│       └── <resource>.py    # route handlers (created per confirmed resource)
├── core/                    # config, security, context, permissions, error_handlers,
│                            # exceptions, pagination, responses, logging
├── db/
│   ├── session.py           # async engine + session factory + get_db
│   └── base.py              # declarative base + id/created_at/updated_at mixin
├── modules/
│   └── <feature>/           # models, schemas, repository, service, engine?, enums, exceptions
└── alembic/                 # migrations
```

Resource files and feature modules are created **on demand, per confirmed feature** — not
scaffolded speculatively.

## Build order for a new (confirmed) feature

1. User confirms the feature, its data shape, and its endpoints → record in `decisions.md`.
2. `models.py` → migration (with `downgrade()`).
3. `repository.py` (queries) → `service.py` (logic) → `engine.py` (pure logic, if any).
4. `schemas.py` (separate request/response) → `api/v1/<resource>.py` (router, wiring only —
   routers live under `app/api/`, not in the module).
5. Register the router; add any module exceptions/enums.

Never start at the router with logic inline; never skip the repository to query from a service.
