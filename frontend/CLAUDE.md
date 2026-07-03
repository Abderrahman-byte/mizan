# Mizan Frontend — Context

> Frontend context for Claude Code. Read the root `../CLAUDE.md` first (especially the
> **working agreement**), then this file, then the referenced docs under `docs/`.

---

## ⚠️ Reminder: do not decide the API contract or data shapes

Endpoints, payloads, and response shapes are owned by the backend and are **not decided yet**.
Do not hardcode API contracts, invent response shapes, or build against assumed JSON. When the
UI needs data, ask the user what the contract is (or confirm it's been recorded in the backend
`decisions.md`). See the root working agreement.

---

## Stack

React · Tailwind CSS · Axios · **Bulletproof React** architecture.

Do not introduce other libraries (state managers, data-fetching libs, component kits, routers)
without asking first.

## Documentation map

- **`docs/architecture.md`** — the Bulletproof React structure: feature-based folders, the
  unidirectional import rule, where components/hooks/api/types live, plus the realized routing,
  Context stores, and mock-data layer. **Read before adding any code.**
- **`docs/conventions.md`** — component patterns, naming, styling with Tailwind, the Axios API
  layer, forms, error/loading states, responsive rules.
- **`docs/design-system.md`** — the **Bloom** design system: tokens, the internal component
  library inventory, spending-mode labels/colors, dark mode, responsive nav.
- **`docs/mock-data.md`** — the typed in-memory mock layer and the exact swap-to-Axios recipe
  (no API integration yet — except auth, which is live).
- **`docs/auth-client.md`** — the live auth plumbing: token storage (`localStorage`), the Axios
  request/response interceptors, and transparent token refresh on `AUTH_TOKEN_EXPIRED`.
- **`docs/setup.md`** — local dev, Docker, environment variables, scripts.
- **`docs/pwa.md`** — the installable PWA: `vite-plugin-pwa` config, manifest/icons, app-shell
  offline scope (never caches `/api/`), auto-update service worker.
- **`docs/decisions.md`** — running log of confirmed frontend decisions. Anything not here is
  open — ask.

## Core principles (Bulletproof React)

- **Feature-based organization.** Code is grouped by feature under `src/features/<feature>/`,
  not by file type globally.
- **Unidirectional imports.** Shared → features → app. Features must not import from each other
  directly; cross-feature composition happens at the app/route level.
- **A single typed API layer** (Axios instance + per-feature `api/` modules). Components never
  call Axios directly.
- **Co-locate** components, hooks, types, and api calls within the feature that owns them.

Full detail in `docs/architecture.md`.

## Responsive (first-class)

The app is **fully responsive**; desktop and mobile are both primary targets. Build mobile
layouts deliberately, not as a shrunk desktop. The final UX direction (the design the user
settled on) drives specifics — confirm the design source with the user before implementing a
screen.

## What is confirmed vs. open

**Confirmed:** the stack (Vite + TS + React 18, Tailwind v4, Axios); Bulletproof React
architecture; responsive-first; routing (`react-router-dom`, one route per screen); state via
per-feature React Context stores (no extra library); the **Bloom** design system + internal
component library (`src/components`); the five screens (Dashboard, Summary, Ledger, Budget Modes,
People); and the typed mock-data layer (no API yet). See `docs/decisions.md`.

**Live against the backend:** **Auth** (`docs/auth-client.md`) and the **People / debt-loan ledger**
(`features/people`, full debt management against `backend/docs/debts.md` — see `docs/decisions.md`,
2026-07-01).

**Open (ask before acting):** the **API contract** for the *remaining* domain features — budget,
transactions, savings, history — is still undecided; those run on the mock layer (reconcile
`src/types` + feature `api/` with the confirmed contract per `docs/mock-data.md`). For **auth**,
only **password reset** (backend 501 stubs) and **profile editing** remain open.

## Before you start a frontend task

1. Confirm the task doesn't depend on an undecided API contract or design detail. If it does →
   ask.
2. Re-read the relevant section of `docs/architecture.md` / `docs/conventions.md`.
3. State your plan and confirmed-vs-assumed split before writing code.

## When a decision is made during a task

Recording it is part of the task (see the root `CLAUDE.md` → "Documentation is part of the
work"). Specifically for the frontend:

- Move the item from **OPEN** to **Confirmed** in `docs/decisions.md` (one line + date).
- Update affected docs: a confirmed build tool → `docs/setup.md`; a chosen router or state/
  data-fetching library → `docs/architecture.md`; a settled design system (tokens, the
  spending-mode visual, mobile nav) → create `docs/design-system.md`; a confirmed API contract
  the client consumes → note it where the API layer is described and link the backend's `api.md`.
- Link any new doc from this file's **Documentation map**.
- Resolve the related `# TODO: confirm` markers.
