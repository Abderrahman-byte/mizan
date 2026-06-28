/* Configured Axios instance for the Mizan backend.

   DORMANT FOR NOW: the app runs entirely on the mock data layer (lib/mock).
   This client is wired up and ready so that, when the API contract is confirmed,
   each feature `api/` function swaps its mock body for a call through here —
   signatures unchanged. The response interceptor below assumes the standard
   `{ data }` / `{ error }` envelope described in docs/architecture.md; confirm
   the exact envelope with the backend before relying on it. */
import axios, { type AxiosError, type AxiosInstance } from 'axios';
import { API_URL } from '@/config/env';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Unwrap the success envelope so callers receive `data` directly.
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  (error: AxiosError<{ error?: { code?: string; message?: string } }>) => {
    const envelope = error.response?.data?.error;
    return Promise.reject({
      code: envelope?.code ?? 'unknown_error',
      message: envelope?.message ?? error.message,
    });
  },
);
