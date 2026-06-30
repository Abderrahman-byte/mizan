/* Auth token storage.

   The access + refresh tokens live in `localStorage` (confirmed in
   backend/docs/auth.md). This module is the single read/write point for them so
   the Axios client (and a future auth store) never touch `localStorage` keys
   directly. It lives in `lib/` — not `features/auth` — because the shared Axios
   client must read tokens and shared layers cannot import from features. */

const ACCESS_KEY = 'mizan.accessToken';
const REFRESH_KEY = 'mizan.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/** Persist a freshly issued access + refresh token pair (login / register / refresh). */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

/** Drop both tokens (logout, or an unrecoverable auth failure). */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
