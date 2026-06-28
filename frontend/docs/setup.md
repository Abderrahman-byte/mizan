# Mizan Frontend — Setup

How to run the frontend locally and via Docker.

## Stack & tooling (confirmed)

- **Vite 6** + **React 18** + **TypeScript** (project scaffold; entry `src/main.tsx`).
- **Tailwind CSS v4** via the `@tailwindcss/vite` plugin (no `tailwind.config.js`; tokens live
  in `src/styles/theme.css` under `@theme`). See `design-system.md`.
- **react-router-dom** for routing; **axios** for the (currently dormant) API layer.
- Path alias `@/*` → `src/*` (configured in `vite.config.ts` and `tsconfig.app.json`).

## Prerequisites

- Docker + docker-compose (primary path)
- Node 20+ (only if running outside Docker)

## Environment variables

- `VITE_API_URL` — base URL of the backend API. See `.env.example`. Only consumed once real API
  integration lands; the app currently runs entirely on the in-memory mock layer
  (see `mock-data.md`).
- Keep secrets out of the frontend; only public config belongs here.

## Running with Docker

```bash
docker compose up --build      # starts db + backend + frontend
```

The frontend service mounts the source for hot reload and talks to the backend at the
configured API URL.

## Running outside Docker

```bash
npm install
npm run dev        # Vite dev server with hot reload (default http://localhost:5173)
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit only
```

## Checks before committing

- App builds and runs.
- No Axios calls outside the feature `api/` layer.
- No feature-to-feature imports; features imported only via their `index.ts`.
- Each async view handles loading / error / empty states.
- Screens verified at mobile and desktop widths.
