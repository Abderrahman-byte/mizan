/* Budget API — categories, the per-mode plan, and reference monthly income.

   Mock-backed for now. To move to the real API, replace each function body with
   the commented Axios call (signatures stay identical). See docs/mock-data.md. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { Category, ModePlan } from '@/types';
import type { PlanMap } from '@/utils/budget';

export function getCategories(): Promise<Category[]> {
  // return apiClient.get('/categories').then((r) => r.data);
  return mockRequest(() => db.categories.map(({ name, icon }) => ({ name, icon })));
}

export function getPlan(): Promise<PlanMap> {
  // return apiClient.get('/budget/plan').then((r) => r.data);
  return mockRequest(() =>
    Object.fromEntries(db.categories.map((c) => [c.name, c.plan])) as PlanMap,
  );
}

export function getMonthlyIncome(): Promise<number> {
  // return apiClient.get('/budget/income').then((r) => r.data);
  return mockRequest(() => db.monthlyIncome);
}

export function updatePlanCell(
  categoryName: string,
  modeIdx: number,
  value: number,
): Promise<void> {
  // return apiClient.patch(`/budget/plan/${categoryName}`, { modeIdx, value });
  return mockRequest(() => {
    const cat = db.categories.find((c) => c.name === categoryName);
    if (cat) cat.plan[modeIdx] = value;
  });
}

export function addCategory(input: Category): Promise<Category> {
  // return apiClient.post('/categories', input).then((r) => r.data);
  return mockRequest(() => {
    const created = { ...input, plan: [0, 0, 0, 0, 0] as ModePlan };
    db.categories.push(created);
    return { name: created.name, icon: created.icon };
  });
}
