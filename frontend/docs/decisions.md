# Mizan Frontend — Decisions Log

The running record of **confirmed** frontend decisions. If it isn't here, it isn't decided —
ask before assuming.

## Confirmed

- **Containerization (2026-06-29):** multi-stage `frontend/Dockerfile`.
  - **Dev** (`target: dev`, used by `docker-compose.dev.yml`): Vite dev server (hot reload),
    `node:22-slim`, host port **5174** (remapped off 5173), source bind-mounted,
    `VITE_API_URL=http://localhost:8088/api` (browser → backend host port).
  - **Prod** (`target: prod`, used by `docker-compose.prod.yml`): built SPA served by
    **nginx** (`frontend/nginx.conf`), which is the **single published origin** (`:80`) and
    proxies `/api` → `backend:8000`. Built with `VITE_API_URL=/api` (relative, same-origin → no
    CORS). See `setup.md`.
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

- **Add-transaction date picker (2026-06-29):** the day-stepper (`− June {day}, 2026 +`) in
  `AddTransactionModal` was replaced with a native `<input type="date">` (styled via the shared
  `TextField`). Simple, OS-native picker — supports any month/year, mobile-friendly — capped at
  today via `max` (future blocked, trivially removable) and defaulting to today. (An interim
  custom calendar-grid primitive was tried and dropped in favour of the native field.)
- **Transaction date shape (2026-06-29):** `Transaction.day: number` (day-of-month, implicitly
  the active month) was replaced with `Transaction.date: string` — an ISO **calendar date**
  (`YYYY-MM-DD`, no time/timezone, sorts as a string), so a transaction can carry any month/year.
  Drove the picker change above; the ledger feed groups by full date (`src/utils/date.ts`
  helpers). **Data-shape change** (frontend types + mock data); signals the eventual API
  contract — reconcile when the backend contract lands (per `mock-data.md`).
- **Per-month ledger scoping + history (2026-06-29):** the Ledger now shows transactions for the
  **displayed** month (filtered by ISO `YYYY-MM` prefix), not just the current one — past months
  are browsable, not "closed". The "Per-transaction detail isn't kept for past months" empty state
  was removed (now a neutral "No transactions in {month}"). Past-month transactions are
  **synthesized** in `lib/mock/db.ts` from each `history` row so the feed's out-sum/in-sum equal
  that month's `spent`/`income` (recap and feed always agree); the current month keeps its
  hand-authored detail. Current-month spend/income aggregation (`transactions-store`) is scoped to
  `ACTIVE_MONTH` (`2026-06`) so seeded history doesn't inflate live figures. Past months remain
  **read-only** (editing would desync from the history summary). Mock-only; no API/contract change.

- **Settings screen v1 (2026-06-29):** new `/settings` route, owned by a new `features/settings`
  (presentational `SettingsScreen`); data wired in `app/routes/settings-page.tsx`. Reached via a
  **gear button in the `PageHeader`** (`SettingsButton`, new `cog` icon) — *not* added to the
  primary sidebar/tab-bar nav. v1 contains: **Savings goal** (edit target amount + label — new
  `updateSavingsGoal` api + `update` on the savings store, optimistic, mock-backed) and a
  **display-only Profile** card (name/email/initials from `currentUser`, which gained a display
  `email` field). Profile editing, password, and sign-out are explicitly deferred until **auth**
  exists. Theme/Monthly income/Category management were considered but left out of v1. No
  API/contract change beyond the mock savings patch.
- **Auth screen structure (2026-06-29):** auth is **two separate routes** (`/signin`, `/signup`),
  not a single tabbed page — chosen for redirect-to-login, distinct URLs, and future flows
  (forgot/reset password). Both are **top-level routes outside `AppLayout`** (no sidebar/tab bar),
  owned by a new `features/auth` (`AuthLayout`, `SignInForm`, `SignUpForm`, `PasswordField`); the
  route pages live in `app/routes/`. **Front-end shells only** — fields, client-side validation,
  show/hide password, and cross-links; a valid submit currently just `navigate('/')` into the app
  (marked with `// TODO: confirm` where real auth goes). Real authentication (API calls, token
  storage, Axios interceptor, route guards / redirect-to-`/signin`) is **still OPEN** — see below.
- **Forgot-password screen (2026-06-29):** added `/forgot-password` (same top-level/`AuthLayout`
  pattern; `ForgotPasswordForm` in `features/auth`). Email field → a "Check your inbox"
  confirmation state (with "use a different email" / "back to sign in"); the confirmation copy is
  account-enumeration-safe ("If an account exists…"). Sign-in now links to it via a "Forgot
  password?" link. **Shell only** — no real reset email/endpoint yet (`// TODO: confirm` in
  `forgot-password-page.tsx`); the actual reset remains OPEN.
- **Reset-password screen (2026-06-29):** added `/reset-password` (same top-level/`AuthLayout`
  pattern; `ResetPasswordForm` in `features/auth`). Reads the reset `token` from the query string
  (`useSearchParams`): **no token → "Link expired"** state (→ request a new link); **token →**
  new-password + confirm form (min 8, must match); **on submit →** "Password updated" success
  (→ sign in). **Shell only** — token isn't validated and no real reset endpoint is called
  (`// TODO: confirm` in `reset-password-page.tsx`). Real reset behavior remains OPEN.

- **Auth API functions (2026-06-30):** `features/auth` gained a **real** (non-mock) `api/auth-api.ts`
  built against the now-confirmed backend auth contract (`backend/docs/auth.md`): `register`,
  `login`, `getCurrentUser` (`GET /v1/auth/me`), `refresh`, and `logout`, with request/response
  types in `features/auth/types/auth.ts` (`AuthUser`, `RegisterRequest`, `LoginRequest`,
  `TokenPair`, `AuthSession`). These call the configured Axios client directly (the auth contract
  is decided + implemented, so they don't use the mock layer the rest of the app runs on). All
  exported from the feature's `index.ts`. **Plumbing only — not wired into the UI**: no token
  storage, no auth request interceptor, and no route guards yet (those stay OPEN below). `forgot-`
  /`reset-password` have no client function (backend stubs return 501).

- **Auth client plumbing (2026-06-30):** activated `lib/api-client.ts` (previously dormant) with
  token storage + transparent refresh. New `lib/auth-tokens.ts` is the single read/write point for
  the access + refresh tokens in **`localStorage`** (`mizan.accessToken` / `mizan.refreshToken`),
  per `backend/docs/auth.md`; it lives in `lib/` (not `features/auth`) because the shared client
  reads tokens and shared layers can't import features. The client now (a) attaches
  `Authorization: Bearer` via a request interceptor, (b) unwraps `{ data }`, and (c) on a
  `401 AUTH_TOKEN_EXPIRED` does a **single-flight** `POST /v1/auth/refresh` (bare axios, no
  interceptor recursion), stores the rotated pair, and replays the request **once** (`_retry`
  guard); a failed refresh `clearTokens()` and rejects. **Not** done here (still open): redirect on
  dead session, `AUTH_TOKEN_INVALID` UI handling, and persisting tokens on login/register. See the
  new `docs/auth-client.md`.

- **Auth UI integration + route guard (2026-06-30):** wired the auth API into the app. New
  **auth store** (`features/auth/stores/auth-store.tsx`, `AuthProvider` + `useAuth()`) is the
  session source of truth — `signIn`/`signUp` (persist tokens via `setTokens`, throw normalized
  errors), `signOut` (clear locally + best-effort server `logout`), and a **bootstrap** that
  hydrates from a stored token via `GET /auth/me` (synchronous `unauthenticated` when no token, so
  no splash flash). `AuthProvider` mounts in `app/providers` above the router. New **route guards**
  (`app/routes/auth-guards.tsx`): `RequireAuth` gates the `AppLayout` subtree (→ `/signin`,
  remembering `from`), `RedirectIfAuthenticated` keeps signed-in users off `/signin`/`/signup`. The
  `SignInForm`/`SignUpForm` gained `submitting`/`error` props (button busy text + inline error
  banner); their pages call the store and surface `authErrorMessage(code)` (INVALID_CREDENTIALS /
  EMAIL_TAKEN / VALIDATION_ERROR). **Sign-out** added to the Sidebar (desktop) and the Settings
  profile card (mobile, where the sidebar is hidden). The mock `currentUser` (db.ts) was **removed**;
  Sidebar / Dashboard / Settings now read `useAuth().user` (initials via the shared `initials()`,
  first name via `firstNameOf`). `forgot`/`reset-password` stay **UI shells** (backend 501 stubs).
  See `docs/auth-client.md`.

## OPEN — must be decided with the user before implementing

> Do **not** invent any of the following. Ask, then record here.

### API contract
- Endpoints, payloads, and response shapes (owned by backend; undecided). The frontend currently
  runs on the mock layer; the domain types in `src/types` and the per-feature `api/` signatures
  are our **expected** shape and must be reconciled with the confirmed backend contract when it
  lands (see `mock-data.md` for the swap recipe). Build real types from the confirmed contract.

### Auth
- Sign-up / sign-in / sign-out, the session store, route guards, and transparent refresh are all
  **built** (confirmed 2026-06-30, see above). What remains open:
  - **Password reset** end-to-end — the backend `forgot-password` / `reset-password` endpoints are
    **501 stubs** (contract undecided), so `/forgot-password` and `/reset-password` stay UI shells
    with `// TODO: confirm` markers. Resolve once the backend designs those contracts.
  - **Profile editing** (change name / email / password) from the Settings screen — deferred.

---

### How to use this file
This log is the source of truth for frontend decisions. Whenever a decision is made:
1. Move it from **OPEN** to **Confirmed** here with a one-line note and the date.
2. Update every doc the decision touches (and create + link a new doc if it needs one) — see the
   root `CLAUDE.md` → "Documentation is part of the work."
3. Resolve any related `# TODO: confirm` markers in the code and docs.
Keep entries short and factual. A decision that isn't written here doesn't exist.
