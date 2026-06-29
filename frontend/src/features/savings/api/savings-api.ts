/* Savings / emergency-fund API.
   Mock-backed for now; swap each body for the commented Axios call later. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { SavingsGoal } from '@/types';

export function getSavingsGoal(): Promise<SavingsGoal> {
  // return apiClient.get('/savings/goal').then((r) => r.data);
  return mockRequest(() => db.savings);
}

/** The goal's user-editable fields (target amount and/or label). */
export type SavingsGoalPatch = Partial<Pick<SavingsGoal, 'goal' | 'label'>>;

export function updateSavingsGoal(patch: SavingsGoalPatch): Promise<SavingsGoal> {
  // return apiClient.patch('/savings/goal', patch).then((r) => r.data);
  return mockRequest(() => {
    db.savings = { ...db.savings, ...patch };
    return db.savings;
  });
}
