/* Auth store — the app's single source of truth for "who is signed in".

   Wraps the auth API functions, persists the token pair via `lib/auth-tokens`
   (localStorage), and exposes the session through `useAuth()`. On mount it
   bootstraps from any stored token by calling `GET /auth/me` (the api-client
   transparently refreshes an expired access token); a failure clears the tokens
   and lands on `unauthenticated`. See docs/auth-client.md. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth-tokens";
import { getCurrentUser, login, logout, register } from "../api/auth-api";
import type { AuthUser, LoginRequest, RegisterRequest } from "../types/auth";

/** `loading` while bootstrapping; then `authenticated` / `unauthenticated`. */
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Authenticate and open a session. Throws the normalized API error on failure. */
  signIn: (input: LoginRequest) => Promise<void>;
  /** Create an account (auto-login). Throws the normalized API error on failure. */
  signUp: (input: RegisterRequest) => Promise<void>;
  /** Clear the local session immediately; revoke the refresh session server-side best-effort. */
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  // No stored token → settle on `unauthenticated` synchronously (no loading flash before
  // the redirect); a stored token → `loading` until the bootstrap below resolves it.
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAccessToken() ? "loading" : "unauthenticated",
  );

  // Bootstrap: hydrate the user from a stored token (or settle on unauthenticated).
  useEffect(() => {
    if (!getAccessToken()) return;
    let active = true;
    getCurrentUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signIn: async (input) => {
        const session = await login(input);
        setTokens(session.accessToken, session.refreshToken);
        setUser(session.user);
        setStatus("authenticated");
      },
      signUp: async (input) => {
        const session = await register(input);
        setTokens(session.accessToken, session.refreshToken);
        setUser(session.user);
        setStatus("authenticated");
      },
      signOut: () => {
        const refreshToken = getRefreshToken();
        clearTokens();
        setUser(null);
        setStatus("unauthenticated");
        // Best-effort server-side revocation; local logout already happened.
        if (refreshToken) {
          logout(refreshToken).catch(() => undefined);
        }
      },
    }),
    [user, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
