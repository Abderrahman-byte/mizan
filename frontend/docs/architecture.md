# Mizan Frontend — Architecture (Bulletproof React)

The frontend follows the **Bulletproof React** architecture. This file is the authoritative
orientation for structure and import rules.

> Reminder: the API contract is **not decided** and is owned by the backend. Build the
> structure; do not bake in assumed response shapes.

## Guiding ideas

1. **Feature-based.** Group by feature, not by file type. Most code lives under
   `src/features/<feature>/`.
2. **Unidirectional imports.** Dependencies flow one way: `shared → features → app`. A feature
   never imports from another feature; the app layer composes features.
3. **Co-location.** A feature owns its components, hooks, API calls, types, and state together.
4. **A typed API layer.** All HTTP goes through a shared Axios client and per-feature `api/`
   modules — never `axios` calls scattered in components.

## Target directory structure

```
src/
├── app/                # app-level setup: providers, router, layout shells, app entry
│   ├── routes/         # route definitions; composes features
│   └── providers/      # context providers, query/client setup, theme
├── assets/             # static assets
├── components/         # shared, generic UI components (design-system level)
├── config/             # runtime config, env access, constants
├── features/
│   └── <feature>/
│       ├── api/        # Axios calls + types for this feature's endpoints
│       ├── components/ # components specific to this feature
│       ├── hooks/      # feature hooks
│       ├── stores/     # feature-local state (if needed)
│       ├── types/      # feature types
│       └── index.ts    # public surface of the feature (import boundary)
├── hooks/              # shared hooks
├── lib/                # configured third-party libs (e.g. the Axios instance)
├── stores/             # shared/global state (only if justified)
├── types/              # shared types
└── utils/              # shared pure utilities
```

Create features **on demand** as the user confirms screens — do not scaffold speculative
feature folders.

## Import boundaries (enforced)

- Import a feature only through its `index.ts` public surface.
- Features must not reach into each other's internals.
- Shared layers (`components`, `hooks`, `lib`, `utils`, `types`) must not import from
  `features`.
- The `app` layer may import from features to compose routes/pages.

## The API layer

- One configured Axios instance in `lib/` (base URL from config, interceptors for auth and the
  standard error envelope).
- Each feature's `api/` module wraps the endpoints it uses and returns typed data.
- Components/hooks call the feature `api/` functions — never Axios directly.

> The backend uses a standard response envelope (`{ data }` / `{ error }`) and camelCase JSON.
> The Axios layer should centralize unwrapping `data` and surfacing `error.code`/`error.message`
> — confirm the exact envelope with the backend `decisions.md` before implementing interceptors.

## State & data fetching

- We use React's built-ins. Each feature owns a **Context store** (`stores/<feature>-store.tsx`)
  exposing its data + mutations through a `use<Feature>()` hook; the providers are composed at the
  app level in `src/app/providers/app-providers.tsx`. No state-management or data-fetching library
  is added.
- Cross-feature composition happens in `src/app`: composite pages (Dashboard, Summary) read
  several feature hooks, and `src/app/hooks/use-month-mode.ts` joins the budget (plan) and
  transactions (actuals) domains to compute the current spending mode. Features never import each
  other.

## Routing (confirmed)

- `react-router-dom` via `createBrowserRouter` (`src/app/routes/router.tsx`). One route per
  screen: `/` (Dashboard), `/summary`, `/ledger`, `/modes`, `/people`; unknown paths redirect to
  `/`. The `AppLayout` shell (sidebar + scrolling content + mobile tab bar) is the route root and
  renders an `<Outlet/>`. Nav config is shared by the sidebar and tab bar via
  `src/app/layout/nav-items.ts`.
- Screen ownership: Ledger → `features/transactions`, Budget Modes → `features/budget`, People →
  `features/people` (each exposes a presentational screen component). Dashboard and Summary are
  composite, so they live in `src/app/routes/` and pull from multiple feature hooks.

## Mock data layer (no API yet)

- `src/lib/mock/db.ts` is a typed in-memory store; per-feature `api/` modules are the only code
  that touches it, returning Promises via `mockRequest()` so they already look async. The
  configured Axios instance (`src/lib/api-client.ts`) is wired but dormant. Swapping to the real
  API replaces each `api/` function body, not its signature. Full recipe in `mock-data.md`.

## Styling

- Tailwind CSS. Keep responsive (`sm: md: lg:`) treatment intentional and mobile-first.
- Shared visual primitives live in `src/components/`; feature-specific UI stays in the feature.
