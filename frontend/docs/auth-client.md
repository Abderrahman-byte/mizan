# Mizan Frontend — Auth Client

How the frontend authenticates requests against the confirmed backend auth contract
(`backend/docs/auth.md`): the **plumbing** (token storage, the Axios interceptors, transparent
refresh) and the **UI integration** (the auth store/hook, route guards, and the wired
sign-in/sign-up/sign-out flows). Password reset (`forgot`/`reset`) stays a UI shell — the backend
endpoints are 501 stubs, so there is no client function for them yet.

## Token storage — `src/lib/auth-tokens.ts`

Access + refresh tokens live in `localStorage` (confirmed in `backend/docs/auth.md`) under
`mizan.accessToken` / `mizan.refreshToken`. This module is the **single** read/write point —
nothing else touches the keys directly:

- `getAccessToken()` / `getRefreshToken()` — read.
- `setTokens(accessToken, refreshToken)` — persist a freshly issued pair.
- `clearTokens()` — drop both.

It lives in `lib/` (not `features/auth`) because the shared Axios client must read tokens, and
shared layers cannot import from features (the unidirectional-import rule). A future auth store
calls `setTokens` after login/register and `clearTokens` on logout.

## The Axios client — `src/lib/api-client.ts`

- **Request interceptor** — attaches `Authorization: Bearer <accessToken>` to every request when a
  token is stored.
- **Response (success) interceptor** — unwraps the `{ data }` envelope so callers receive `data`
  directly.
- **Response (error) interceptor** — normalizes errors to `{ code, message }` from the `{ error }`
  envelope, and drives the refresh flow below.

### Transparent refresh on `AUTH_TOKEN_EXPIRED`

When a request returns `401` with code **`AUTH_TOKEN_EXPIRED`**, the client:

1. Marks the failed request with a one-shot `_retry` guard (so a request is only retried once —
   no infinite loop if the refreshed token is also rejected).
2. Calls `POST /v1/auth/refresh` with the stored refresh token, **single-flight**: concurrent
   401s share one in-flight refresh promise rather than each firing their own (which would rotate
   the token repeatedly and invalidate the others). The refresh uses a **bare axios call**, not
   `apiClient`, to skip the interceptors (no bearer header, no recursive refresh) and read the raw
   envelope itself.
3. Persists the rotated pair via `setTokens` and replays the original request with the new token.
4. If the refresh **fails** (missing / `REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_EXPIRED`), the
   session is dead: it `clearTokens()` and rejects with the original normalized error.

### `AUTH_TOKEN_INVALID`

Only `AUTH_TOKEN_EXPIRED` triggers a refresh. An `AUTH_TOKEN_INVALID` (malformed/bad token, or a
vanished user) is **not** refreshed — it rejects, and the bootstrap path (below) treats it as a
dead session: clear tokens → `unauthenticated` → the guard redirects to `/signin`.

## The auth store — `src/features/auth/stores/auth-store.tsx`

`AuthProvider` (mounted in `app/providers/app-providers.tsx`, above the router) is the single
source of truth for the session, exposed via `useAuth()`:

- `user: AuthUser | null`, `status: 'loading' | 'authenticated' | 'unauthenticated'`.
- `signIn(input)` / `signUp(input)` — call `login` / `register`, persist the pair with `setTokens`,
  set the user, and flip to `authenticated`. They **throw** the normalized `{ code, message }` on
  failure; the pages map it to a message via `authErrorMessage`.
- `signOut()` — clears local tokens + user **immediately** (UI updates at once) and fires a
  best-effort `POST /auth/logout` to revoke the refresh session server-side.
- **Bootstrap:** `status` starts `unauthenticated` when there is no stored access token (no loading
  flash) or `loading` when there is — in which case it calls `getCurrentUser()` once (the client
  refreshes transparently if the access token is stale) and resolves to `authenticated`, or clears
  tokens and lands `unauthenticated` on any failure.

## Route guards — `src/app/routes/auth-guards.tsx`

Live in the app layer (it owns routing and composes features). While `status === 'loading'` both
show a centered splash.

- `RequireAuth` wraps the `AppLayout` subtree in `router.tsx`: `unauthenticated` → redirect to
  `/signin`, remembering the attempted path in `location.state.from` so sign-in can return there.
- `RedirectIfAuthenticated` wraps `/signin` and `/signup`: an already-signed-in user is bounced to
  `/`.

## Where the user is shown

`useAuth().user` (not the old mock `currentUser`, now removed) feeds the Sidebar (name + initials +
Sign out), the Dashboard greeting (`firstNameOf`), and the Settings profile card (which also has a
Sign out button for mobile, where the sidebar is hidden). Initials come from the shared
`initials()` primitive.

### Still open

- **Password reset** end-to-end (backend `forgot`/`reset` are 501 stubs) — the `/forgot-password`
  and `/reset-password` screens remain UI shells.
- **Profile editing** (name/email/password) from Settings.

## Pagination helpers (2026-07-01)

The success-envelope unwrap drops everything but `data`, which would lose the `pagination` block on
list endpoints. The response interceptor now **also copies `pagination` onto the response object**,
and `lib/api-client.ts` exports two helpers used by paginated features (first consumer: People):

- `getPage<T>(url, params)` → `{ items, pagination }` for one page.
- `getAll<T>(url, params, pageSize=100)` → every page concatenated, for client-side list screens
  that filter/search/paginate in the browser.

Single-resource calls are unaffected (they still receive `data` directly).
