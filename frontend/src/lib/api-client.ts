/* Configured Axios instance for the Mizan backend.

   The app's domain features still run on the mock layer (lib/mock), but the auth
   feature talks to the real backend, so this client is now active. It:
     - attaches `Authorization: Bearer <accessToken>` to every request (request interceptor);
     - unwraps the standard `{ data }` success envelope so callers receive `data` directly;
     - on a `401 AUTH_TOKEN_EXPIRED`, transparently refreshes the token pair once and retries
       the original request; if the refresh itself fails it clears the stored tokens.
   Tokens are read/written through `lib/auth-tokens` (localStorage). Error responses are
   normalized to `{ code, message }` from the `{ error }` envelope. See docs/auth-client.md. */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_URL } from "@/config/env";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./auth-tokens";

/** Normalized error shape callers receive on rejection (from the `{ error }` envelope). */
export interface ApiError {
  code: string;
  message: string;
}

/** Axios request config carrying our one-shot retry guard. */
interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the access token to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function normalizeError(
  error: AxiosError<{ error?: Partial<ApiError> }>,
): ApiError {
  const envelope = error.response?.data?.error;
  return {
    code: envelope?.code ?? "unknown_error",
    message: envelope?.message ?? error.message,
  };
}

/* Single-flight token refresh: concurrent 401s share one `/auth/refresh` call rather than
   each firing their own (which would rotate the token repeatedly and invalidate the others).
   Uses a bare axios call — not `apiClient` — to skip the interceptors above (no bearer header,
   no recursive refresh) and to read the raw `{ data }` envelope itself. */
let refreshing: Promise<string> | null = null;

async function refreshTokens(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error("No refresh token"));
  }
  return axios
    .post<{
      data: { accessToken: string; refreshToken: string };
    }>(`${API_URL}/v1/auth/refresh`, { refreshToken }, { headers: { "Content-Type": "application/json" } })
    .then((response) => {
      const { accessToken, refreshToken: rotated } = response.data.data;
      setTokens(accessToken, rotated);
      return accessToken;
    });
}

apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the success envelope so callers receive `data` directly.
    const body = response.data;
    if (body && typeof body === "object" && "data" in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error: AxiosError<{ error?: Partial<ApiError> }>) => {
    const original = error.config as RetriableConfig | undefined;
    const code = error.response?.data?.error?.code;

    // The access token expired: refresh once and replay the original request.
    if (
      error.response?.status === 401 &&
      code === "AUTH_TOKEN_EXPIRED" &&
      original &&
      !original._retry
    ) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = refreshTokens().finally(() => {
            refreshing = null;
          });
        }
        const accessToken = await refreshing;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        // Refresh failed (invalid/expired/missing refresh token): the session is dead.
        clearTokens();
        return Promise.reject(normalizeError(error));
      }
    }

    return Promise.reject(normalizeError(error));
  },
);
