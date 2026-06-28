# Mizan Frontend — Conventions

Patterns and rules for writing frontend code. Pairs with `architecture.md` (structure) — this
covers the *how-to-write-it* details.

> Reminder: don't build against an assumed API contract. Confirm shapes with the backend first.

## Components

- Function components with hooks. One component per file; name the file after the component.
- Keep components presentational where possible; push data fetching into feature hooks/api.
- Co-locate a component's styles (Tailwind classes), local types, and tests with it.

## Naming

- Components: `PascalCase` (file and symbol).
- Hooks: `useCamelCase`.
- Variables/functions: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Feature folders: `kebab-case` or `camelCase` — pick one with the user and stay consistent.

## TypeScript

- Prefer explicit types at module boundaries (api functions, hooks, component props).
- Define API response/request types in the feature's `types/` (or `api/`) — derived from the
  **confirmed** backend contract, not guessed.

## Styling (Tailwind)

- **Mobile-first**: base classes target mobile; layer `sm: md: lg:` for larger viewports.
- Extract repeated class strings into shared components rather than copy-pasting.
- Keep design tokens (colors, spacing scale) aligned with the settled design direction;
  centralize theme in Tailwind config.

## The API / Axios layer

- A single configured Axios instance in `lib/` with:
  - base URL from `config/`,
  - request interceptor for auth (when auth is confirmed),
  - response interceptor that unwraps the success envelope and normalizes errors.
- Per-feature `api/` functions return typed domain data, not raw Axios responses.
- Never call `axios` directly from a component or page.

## Forms, loading & errors

- Every async view handles three states explicitly: **loading**, **error**, **empty/success**.
- Surface backend `error.code` in a user-friendly way; never dump raw errors.
- Validate inputs client-side for UX, but treat the backend as the source of truth.

## Responsive rules

- Design and verify each screen at mobile and desktop widths.
- Dense/grid screens need an explicit mobile strategy (stack, horizontal scroll with frozen
  column, accordion, or one-column-at-a-time) — follow the settled design; confirm if unclear.
- Provide a clear mobile navigation pattern (confirm with the design).

## Don't over-engineer

- No global state manager, data-fetching library, or component kit until there's a real,
  agreed need. Start simple.
