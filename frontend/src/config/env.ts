/* Runtime config. Only public values belong here — never secrets. */

/** Base URL of the Mizan backend API. Consumed by the (currently dormant) Axios
 *  client in lib/api-client. The app runs on the mock layer until APIs land. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

/** Simulated latency (ms) for the mock data layer, to exercise loading states. */
export const MOCK_LATENCY_MS = 220;
