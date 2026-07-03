# Mizan Backend — Context

> Backend context for Claude Code. Read the root `../CLAUDE.md` first (especially the
> **working agreement**), then this file, then the referenced docs under `docs/`.

---

## ⚠️ Reminder: do not decide schema or endpoints

The **database schema** and the **API endpoint surface** are **not decided yet**. Do not
create models, migrations, routers, or schemas that assume a shape. Ask the user first. See
the root working agreement — it governs everything here.

---

## Stack

FastAPI · PostgreSQL · SQLAlchemy + Alembic · Pydantic v2 · loguru.

Do not introduce other libraries without asking.

## Documentation map

Read the doc relevant to your task. These hold the *how*; this file is just the index.

- **`docs/conventions.md`** — module structure, layering rules, API conventions, error
  handling, logging, database, and guardrails. **This is the primary reference — read it
  before writing any backend code.**
- **`docs/architecture.md`** — the layered module pattern explained, directory layout, and
  where each kind of code belongs.
- **`docs/setup.md`** — local dev, Docker, environment variables, running migrations, running
  the app.
- **`docs/decisions.md`** — running log of confirmed decisions. **Schema and endpoints will be
  recorded here once the user decides them — until then they are open.**
- **`docs/schema.md`** — confirmed database tables (currently: `users`). Tables appear here only
  after the user confirms them.
- **`docs/auth.md`** — authentication: confirmed mechanism/token/refresh/identity decisions, what
  is still open, and per-piece build status.
- **`docs/debts.md`** — debt/loan ledger (**implemented**): counterparties, debts, repayments
  tables; status/over-repayment/write-off rules; the 19-route endpoint surface (incl. the
  `mizan-debts` export/import document); contracts; error codes.
- **`docs/transactions.md`** — transactions ledger (**implemented**): categories + transactions
  tables; the category↔direction rule; default-category seeding/backfill; the 11-route endpoint
  surface (incl. the month summary); contracts; error codes.

## The layering rule (non-negotiable)

Every feature is a module with strictly separated layers; each may only call the one below:

```
router      → routing, DI, schema ⇄ ORM mapping. NO business logic, NO DB queries.
service     → business logic. Calls repositories. NO direct DB session, NO routing.
repository  → DB queries only (async). NO business logic, NO HTTP.
models      → SQLAlchemy ORM only. NO business logic, NO HTTP.
engine.py   → (optional) pure functions, no I/O — trivially unit-testable.
```

Full detail in `docs/conventions.md` and `docs/architecture.md`.

## What is confirmed vs. open

**Confirmed:** the stack, the layered module structure, the API response/error envelope
conventions, logging and DB hygiene rules (all in `docs/conventions.md`).

**Open (ask before acting):** every table and column; every endpoint, payload, and response
shape; auth mechanism specifics; pagination defaults beyond the generic template; the error-code
catalogue entries specific to this project.

## Before you start a backend task

1. Confirm the task doesn't require an undecided schema/endpoint. If it does → ask.
2. Re-read the relevant section of `docs/conventions.md`.
3. State your plan and your confirmed-vs-assumed split before writing code.

## When a decision is made during a task

Recording it is part of the task (see the root `CLAUDE.md` → "Documentation is part of the
work"). Specifically for the backend:

- Move the item from **OPEN** to **Confirmed** in `docs/decisions.md` (one line + date).
- Update affected docs: a confirmed schema → reflect it where models/architecture are described
  and create `docs/schema.md` if the topic needs its own home; a confirmed endpoint → create/
  update `docs/api.md`; a new business rule → add its `<RULE>_VIOLATION` code to the error-code
  catalogue in `conventions.md`; an auth decision → `docs/auth.md`.
- Link any new doc from this file's **Documentation map**.
- Resolve the related `# TODO: confirm` markers.
