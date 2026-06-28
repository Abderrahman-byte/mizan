# Mizan Frontend — Decisions Log

The running record of **confirmed** frontend decisions. If it isn't here, it isn't decided —
ask before assuming.

## Confirmed

- **Stack:** React, Tailwind CSS, Axios.
- **Architecture:** Bulletproof React (feature-based, unidirectional imports, typed API layer).
  See `architecture.md`.
- **Responsive:** fully responsive; desktop and mobile both first-class.
- **API access:** all HTTP through a single configured Axios instance + per-feature `api/`
  modules; components never call Axios directly.
- **Build tooling (2026-06-28):** Vite + TypeScript + React 18. Scripts: `dev`, `build`
  (`tsc -b && vite build`), `preview`, `typecheck`. See `setup.md`.
- **Styling (2026-06-28):** Tailwind CSS **v4** via `@tailwindcss/vite`. Bloom design tokens
  defined as CSS variables + surfaced through `@theme` in `src/styles/theme.css`. See
  `design-system.md`.
- **Routing (2026-06-28):** `react-router-dom` (`createBrowserRouter`), one URL route per
  screen (`/`, `/summary`, `/ledger`, `/modes`, `/people`). Composite pages live in
  `src/app/routes/`; nav config in `src/app/layout/nav-items.ts`.
- **State / data (2026-06-28):** React **Context** stores, one per feature (no state or
  data-fetching library added). App-level composition via `src/app/providers` and
  `src/app/hooks/use-month-mode.ts`.
- **Design system (2026-06-28):** the **Bloom** direction (imported prototype). Settled mode
  labels **Bare / Basics / Comfort / Treat / Feast**, growth-style mode badges, purple accent,
  light + dark mode. The prototype's design-exploration "tweaks panel" was dropped. See
  `design-system.md`.
- **Mock data (2026-06-28):** no API integration yet. A typed in-memory store (`src/lib/mock`)
  behind per-feature `api/` async functions mirrors the expected REST contract; the configured
  Axios client (`src/lib/api-client.ts`) is wired but dormant. See `mock-data.md`.
- **Feature-folder casing (2026-06-28):** `kebab-case` for folders and non-component files;
  `PascalCase` for component files.
- **People search UI (2026-06-28):** the People list header **Search** pill is a toggle that
  swaps in an inline search field, filtering the in-memory list client-side by name or note
  (case-insensitive); empty-match shows a "No people match" state. Added a `close` icon to the
  `IconName` registry. No API/contract change — filtering is purely client-side over the existing
  store.
- **People balance filter (2026-06-29):** the People list header has a filter row — **All /
  Owed to you / You owe** (each with a live count) — narrowing the list by sign of balance.
  Combines with the search query; client-side only, no API/contract change.
- **People pagination (2026-06-29):** the People list is paginated client-side at **8 per page**
  with a **Prev / "Page N of M" / Next** bar (hidden when the result fits on one page). Page
  resets to 1 when search/filter change and clamps if the list shrinks. No API/contract change;
  when the backend contract lands, this can move to server-side paging.

## OPEN — must be decided with the user before implementing

> Do **not** invent any of the following. Ask, then record here.

### API contract
- Endpoints, payloads, and response shapes (owned by backend; undecided). The frontend currently
  runs on the mock layer; the domain types in `src/types` and the per-feature `api/` signatures
  are our **expected** shape and must be reconciled with the confirmed backend contract when it
  lands (see `mock-data.md` for the swap recipe). Build real types from the confirmed contract.

### Auth
- Sign-up / login flow, token storage, and the request-auth interceptor. Not yet built; the
  Axios client has a placeholder for it.

---

### How to use this file
This log is the source of truth for frontend decisions. Whenever a decision is made:
1. Move it from **OPEN** to **Confirmed** here with a one-line note and the date.
2. Update every doc the decision touches (and create + link a new doc if it needs one) — see the
   root `CLAUDE.md` → "Documentation is part of the work."
3. Resolve any related `# TODO: confirm` markers in the code and docs.
Keep entries short and factual. A decision that isn't written here doesn't exist.
