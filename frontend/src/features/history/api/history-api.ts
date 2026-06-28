/* History API — the all-time monthly series plus month metadata.
   Mock-backed for now; swap each body for the commented Axios call later. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { MonthHistory } from '@/types';

export interface HistoryMeta {
  /** Current month label, e.g. "June 2026". */
  month: string;
  /** When tracking began, e.g. "May 2025". */
  trackingSince: string;
}

export function getHistory(): Promise<MonthHistory[]> {
  // return apiClient.get('/history').then((r) => r.data);
  return mockRequest(() => db.history);
}

export function getHistoryMeta(): Promise<HistoryMeta> {
  // return apiClient.get('/history/meta').then((r) => r.data);
  return mockRequest(() => ({ month: db.month, trackingSince: db.trackingSince }));
}
