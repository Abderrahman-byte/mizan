# Mizan — Project Context

> **Mizan** (ميزان — "balance / scale") is a personal budgeting web app built around a
> **spending-mode** concept. This file is the entry point for Claude Code. Read it first,
> then read the relevant `backend/CLAUDE.md` or `frontend/CLAUDE.md` before doing any work.

---

## ⚠️ Working agreement (read this first)

**Claude Code must not make any non-trivial decision without asking the user first.**

This is the single most important rule in this repository. Specifically:

- **Never invent the database schema.** Table shapes, columns, relationships, and types are
  **not yet decided**. Ask before creating models or migrations.
- **Never invent API endpoints.** Routes, payloads, query params, and response shapes are
  **not yet decided**. Ask before adding routes or schemas.
- **Never pick a library, pattern, or tool** that isn't already named in this file or the
  per-area docs without proposing it and getting approval.
- When requirements are missing or ambiguous: **stop and ask focused questions.** Do not guess.
- Mark any unavoidable placeholder with `# TODO: confirm before implementing` and call it out
  in your summary.
- Distinguish clearly between what's **confirmed** (in these docs) and what's **assumed**.

If a task seems to require a decision that hasn't been made, the correct action is to ask —
not to proceed with a reasonable-looking default.

---

## What the app does

A multi-user budgeting tool. The core idea is **spending modes**: the user defines several
budget tiers from leanest to most indulgent (e.g. Survival → Necessities → Nec+ → Fun → Go
nuts). Each tier sets a planned amount per spending category. Each month, the app compares
actual spending against those tiers and reports which **mode** that month landed in.

Beyond monthly budgeting, the app tracks a **debt/loan ledger** across many people (money the
user owes vs. money owed to the user), and progress toward a savings/emergency-fund goal.

> The product concepts above are background. The exact data model and endpoints that express
> them are **deliberately left undecided** in these files — see the working agreement.

## Primary users & platforms

- Multi-user (people sign up with their own accounts).
- **Fully responsive** — desktop and mobile are both first-class. Mobile is not an afterthought.
- Currency is Moroccan Dirham (DH).

## Monorepo layout

```
mizan/
├── CLAUDE.md            # ← you are here (whole-project context)
├── docker-compose.yml   # orchestration: db + backend + frontend
├── backend/
│   ├── CLAUDE.md        # backend context → points into backend/docs/
│   └── docs/            # backend conventions, setup, decisions
└── frontend/
    ├── CLAUDE.md        # frontend context → points into frontend/docs/
    └── docs/            # frontend conventions, setup, decisions
```

## Tech stack (decided)

**Backend:** FastAPI · PostgreSQL · SQLAlchemy + Alembic · loguru
**Frontend:** React · Tailwind CSS · Axios · Bulletproof React architecture
**Infra:** Docker + docker-compose

Do not add to or substitute this stack without asking.

## How to navigate context

- Working on the **API / DB / services** → read **`backend/CLAUDE.md`** and the files it
  references under `backend/docs/`.
- Working on the **UI / client** → read **`frontend/CLAUDE.md`** and the files it references
  under `frontend/docs/`.
- A change spanning both → read both area `CLAUDE.md` files first.

## Global conventions

- Keep business logic in the backend, never in the frontend.
- All money values are in DH; format consistently (decide formatting with the user).
- Timestamps are ISO 8601 UTC across the API boundary.
- **Don't over-engineer.** No speculative abstractions, queues, or event buses until a real
  need exists and the user agrees.

## Documentation is part of the work

**Every decision made during a task must be written back into the context/docs as part of that
same task — not left only in chat.** Docs are the source of truth; a decision that lives only in
a conversation is considered lost.

When a decision is made (by the user, or proposed by Claude Code and approved):

- **Record it** in the relevant `docs/decisions.md` — move the item from its **OPEN** section to
  **Confirmed** with a one-line note and the date.
- **Update the affected docs** so they reflect the new reality: e.g. a confirmed schema updates
  the backend architecture/conventions notes; a confirmed endpoint updates the API surface notes;
  a confirmed build tool updates `setup.md`; a new error code updates the error-code catalogue.
- **Create a new doc** when a decision introduces a topic the existing docs don't cover (e.g.
  `backend/docs/schema.md` or `backend/docs/api.md` once those are decided, an `auth.md`, a
  `deployment.md`). Link any new doc from the relevant `CLAUDE.md` documentation map.
- **Remove or resolve** the corresponding `# TODO: confirm` markers once the decision lands.
- Keep `CLAUDE.md` files as thin indexes — detailed content goes in `docs/`, with the `CLAUDE.md`
  documentation map updated to point at anything new.

The docs and the code must never drift: if a change makes a doc stale, fixing the doc is part of
the change.

## Definition of done (per change)

1. Matches the conventions in the relevant area docs.
2. No undecided schema/endpoint invented without approval.
3. **Every decision made is recorded in the relevant `docs/decisions.md`, and all affected docs
   are updated (or new docs created and linked) to reflect it.**
4. Confirmed vs. assumed clearly stated in the summary.
5. Any `# TODO: confirm` markers are either resolved (if the decision was made) or surfaced to
   the user (if still open).
6. No doc left stale by the change.
