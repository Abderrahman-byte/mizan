/* Savings / emergency-fund API.
   Mock-backed for now; swap each body for the commented Axios call later. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { SavingsGoal } from '@/types';

export function getSavingsGoal(): Promise<SavingsGoal> {
  // return apiClient.get('/savings/goal').then((r) => r.data);
  return mockRequest(() => db.savings);
}
