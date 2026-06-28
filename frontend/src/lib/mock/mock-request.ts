import { MOCK_LATENCY_MS } from '@/config/env';

/**
 * Resolve a value as a Promise after a small simulated network delay, returning
 * a deep clone so callers can never mutate the in-memory store by reference.
 * This mirrors an async API call; swapping to real Axios later changes only the
 * body of each feature `api/` function, not its signature. See docs/mock-data.md.
 */
export function mockRequest<T>(produce: () => T, delay = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(produce())), delay);
  });
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}
