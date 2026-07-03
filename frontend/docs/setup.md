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

- `VITE_API_URL` — base URL of the backend API **as seen by the browser**, so it points at the
  backend's host port: `http://localhost:8088/api` (default in `docker-compose.dev.yml`). Not the
  in-network `backend:8000`. Set it in the repo-root `./.env` (see root `./.env.example`). Only
  consumed once real API integration lands; the app currently runs entirely on the in-memory
  mock layer (see `mock-data.md`).
- Keep secrets out of the frontend; only public config belongs here.

## Running with Docker (primary path)

```bash
docker compose -f docker-compose.dev.yml up --build   # db + backend + frontend, hot reload
```

- Frontend (Vite dev server, hot reload): <http://localhost:5174>
- Host port **5174** (container 5174) — remapped off Vite's default 5173 to avoid clashing with
  a local dev server; same port in/out keeps HMR's websocket working.
- Source is bind-mounted; `node_modules` stays in the image (anonymous volume).

## Running in production

```bash
DB_PASSWORD=... JWT_SECRET=... \
  docker compose -f docker-compose.prod.yml up -d --build
```

The standalone `docker-compose.prod.yml` builds the frontend's **prod** image (`target: prod` in
`frontend/Dockerfile`): the SPA is built and served by **nginx** (`frontend/nginx.conf`), which
serves static assets and proxies `/api` → `backend:8000`, so the client uses a relative `/api`
(`VITE_API_URL=/api`, inlined at build time) with no CORS. It publishes **`127.0.0.1:8080`**
only; the public entry point is a **host nginx** (`deploy/nginx/mizan.conf`) that terminates TLS
(Cloudflare Origin CA cert) in front of it. Full stack detail in `backend/docs/setup.md`.

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
