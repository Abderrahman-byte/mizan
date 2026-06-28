# Mizan

**Mizan** (ميزان — "balance / scale") is a personal budgeting web app built around a
spending-mode concept, with a debt/loan ledger and savings-goal tracking. Multi-user, fully
responsive (desktop + mobile).

## Repository layout

```
mizan/
├── CLAUDE.md              # whole-project context (start here)
├── docker-compose.yml     # db + backend + frontend  (# TODO: author once services confirmed)
├── backend/
│   ├── CLAUDE.md          # backend context
│   └── docs/              # conventions, architecture, setup, decisions
└── frontend/
    ├── CLAUDE.md          # frontend context
    └── docs/              # architecture, conventions, setup, decisions
```

## Stack

- **Backend:** FastAPI · PostgreSQL · SQLAlchemy + Alembic · loguru
- **Frontend:** React · Tailwind · Axios · Bulletproof React
- **Infra:** Docker + docker-compose

## Working with Claude Code

Read `CLAUDE.md` first. The most important rule: **Claude Code does not make non-trivial
decisions — especially database schema or API endpoints — without asking.** Confirmed decisions
live in each area's `docs/decisions.md`; anything not recorded there is open.

## Status

Context and conventions are in place. Database schema, API endpoints, and feature
implementation are **intentionally not started** — they're decided with the user, one
confirmation at a time.
