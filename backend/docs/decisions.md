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

## OPEN — must be decided with the user before implementing

> Do **not** invent any of the following. Ask, then record the answer here.

### Database schema
- All tables, columns, types, and relationships. **Nothing about the schema is decided.**

### API endpoints
- All routes, path/query params, request payloads, and response shapes. **No endpoint is
  decided.**

### Auth
- Mechanism, token lifetimes, signup fields, session/refresh strategy.

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
