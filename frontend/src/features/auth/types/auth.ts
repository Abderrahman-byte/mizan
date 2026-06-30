/* Auth domain + request/response types.

   These mirror the **confirmed** backend auth contract (camelCase JSON,
   ISO-8601 UTC timestamps) recorded in backend/docs/auth.md. Unlike the rest
   of the app — which runs on the mock layer because its contract is still open —
   the auth endpoints are decided and implemented, so these talk to the real API. */

/** The authenticated user as returned by the backend (the `user` object on
 *  register/login, and the body of `GET /auth/me`). */
export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  /** ISO-8601 UTC timestamp. */
  createdAt: string;
}

/** Body of `POST /auth/register`. */
export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
}

/** Body of `POST /auth/login`. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** A freshly issued access + refresh token pair. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Success body of register and login: the user plus a token pair. */
export interface AuthSession extends TokenPair {
  user: AuthUser;
}
