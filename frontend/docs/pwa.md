# PWA

Mizan is installable as a Progressive Web App. Decided 2026-07-03 (see `decisions.md`).

## Tooling

**`vite-plugin-pwa`** (devDependency, Workbox `generateSW` mode), configured in
`vite.config.ts`. The build emits `manifest.webmanifest` + `sw.js`; the service worker is
registered in `src/main.tsx` via `registerSW({ immediate: true })` from `virtual:pwa-register`
(types referenced in `src/vite-env.d.ts`). `devOptions.enabled: true` serves the manifest and a
dev service worker from the Vite dev server too (scratch output in `dev-dist/`, gitignored), so
the app is installable in dev as well — but prod behavior is the source of truth; verify with
`npm run build && npm run preview`.

> Installability requires a **secure context**: `localhost` (any port) or HTTPS. Opening the dev
> server via a LAN IP (`http://192.168.x.x:5174`, e.g. from a phone) will never show an install
> prompt — use the deployed HTTPS site for mobile install testing.

## Manifest

`id: /`, name "Mizan - Personal Budgeting" / short name "Mizan", `display: standalone`, `start_url: /`,
theme color `#7b61d6` (brand purple), background `#f6f4fb` (light `--bg`). `index.html` carries
the matching `theme-color` / iOS meta tags and `apple-touch-icon` link.

## Icons

Generated from `public/mizan.svg` with ImageMagick (regenerate the same way if the logo changes):

- `pwa-192x192.png`, `pwa-512x512.png` — purpose `any`, transparent-corner rounded square.
- `pwa-maskable-512x512.png` — purpose `maskable`, full-bleed `#7b61d6` with the glyph inside
  the safe zone (`magick -size 512x512 xc:'#7b61d6' ( mizan.svg -resize 400x400 ) -gravity
  center -composite`).
- `apple-touch-icon.png` — 180×180 full-bleed for iOS.

## Offline scope — app shell only

The SW precaches the built shell (`js/css/html/svg/png/woff2`) and uses `/index.html` as the
SPA navigation fallback. **`/api/` is never served by the SW** (`navigateFallbackDenylist:
[/^\/api\//]`, no `runtimeCaching`): API data is money/auth-sensitive, so offline requests fail
into the normal error states rather than showing stale balances. Installed app loads instantly;
data requires network.

## Updates — auto

`registerType: 'autoUpdate'`: a new SW activates as soon as it's downloaded; the app serves the
new build on the next navigation, no prompt. To support this, `nginx.conf` serves `sw.js` and
`index.html` with `Cache-Control: no-cache` (hashed `/assets/` remain immutable, 1y).

## Explicitly out of scope (for now)

- **Push / notifications** — deliberately not set up (decided 2026-07-03).
- Offline caching of API reads, background sync, install-prompt UI.
