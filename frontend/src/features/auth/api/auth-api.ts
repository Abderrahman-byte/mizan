/* Auth API — register, login, current user, token refresh, logout.

   Unlike the other feature `api/` modules (mock-backed, since their contract is
   still open), these call the **real** backend through the configured Axios
   client: the auth contract is confirmed and implemented (backend/docs/auth.md).
   The client's response interceptor unwraps the `{ data }` envelope, so each call
   resolves to the inner payload; errors reject as `{ code, message }`.

   Not wired into the UI yet — these are the plumbing only (no token storage, no
   auth request interceptor, no route guards; those remain open). */
import { apiClient } from '@/lib/api-client';
import type {
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  TokenPair,
} from '../types/auth';

/** Create a new account and auto-login. `POST /v1/auth/register` → `201`.
 *  Resolves to the new user plus an access + refresh token pair.
 *  Rejects `EMAIL_TAKEN` (409) or `VALIDATION_ERROR` (400). */
export async function register(input: RegisterRequest) {
  return apiClient.post<AuthSession>('/v1/auth/register', input).then((r) => r.data);
}

/** Authenticate and open a session. `POST /v1/auth/login` → `200`.
 *  Resolves to the user plus an access + refresh token pair.
 *  Rejects `INVALID_CREDENTIALS` (401) for any bad input (no account enumeration). */
export async function login(input: LoginRequest) {
  return apiClient.post<AuthSession>('/v1/auth/login', input).then((r) => r.data);
}

/** Fetch the authenticated user's profile. `GET /v1/auth/me` → `200`.
 *  The `Authorization: Bearer <access-token>` header is attached by the api-client request
 *  interceptor (which also refreshes on expiry). Rejects `AUTH_TOKEN_INVALID` (401) when there
 *  is no usable session. */
export async function getCurrentUser() {
  return apiClient.get<AuthUser>('/v1/auth/me').then((r) => r.data);
}

/** Rotate the refresh token for a fresh access token. `POST /v1/auth/refresh` → `200`.
 *  The presented session is revoked and replaced; resolves to the rotated pair only.
 *  Rejects `REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_EXPIRED` (401) → client re-logs-in. */
export async function refresh(refreshToken: string) {
  return apiClient.post<TokenPair>('/v1/auth/refresh', { refreshToken }).then((r) => r.data);
}

/** Revoke the presented refresh session (server-side logout). `POST /v1/auth/logout` → `204`.
 *  Only that one session is revoked; resolves to nothing.
 *  Rejects `REFRESH_TOKEN_INVALID` / `REFRESH_TOKEN_EXPIRED` (401) like refresh. */
export async function logout(refreshToken: string) {
  return apiClient.post('/v1/auth/logout', { refreshToken }).then(() => undefined);
}
