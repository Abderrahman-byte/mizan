/* People / debt-ledger API — live backend (see backend/docs/debts.md).
   The Axios client unwraps the `{ data }` envelope; `getPage`/`getAll` add pagination.
   Money arrives as decimal strings and is parsed to `number` here. */
import { apiClient, getAll } from '@/lib/api-client';
import type {
  Counterparty,
  CreateCounterpartyPayload,
  CreateDebtPayload,
  CreateRepaymentPayload,
  Debt,
  DebtExportDocument,
  DebtFilters,
  DebtImportResult,
  DebtSummaryTotals,
  Repayment,
  UpdateCounterpartyPayload,
  UpdateDebtPayload,
  UpdateRepaymentPayload,
} from '../types/debts';

// --- wire (raw) shapes: money as strings, exactly as the API returns ---

interface RawCounterparty {
  id: number;
  name: string;
  note: string | null;
  balance: string;
  createdAt: string;
  updatedAt: string;
}
interface RawRepayment {
  id: number;
  amount: string;
  paidOn: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
interface RawDebt {
  id: number;
  counterparty: { id: number; name: string };
  direction: Debt['direction'];
  principalAmount: string;
  outstanding: string;
  status: Debt['status'];
  description: string | null;
  incurredOn: string;
  writtenOffAt: string | null;
  createdAt: string;
  updatedAt: string;
  repayments?: RawRepayment[];
}
interface RawSummary {
  totalIOwe: string;
  totalOwedToMe: string;
  net: string;
}

const mapCounterparty = (c: RawCounterparty): Counterparty => ({
  ...c,
  balance: Number(c.balance),
});

const mapRepayment = (r: RawRepayment): Repayment => ({
  ...r,
  amount: Number(r.amount),
});

const mapDebt = (d: RawDebt): Debt => ({
  ...d,
  principalAmount: Number(d.principalAmount),
  outstanding: Number(d.outstanding),
  repayments: d.repayments?.map(mapRepayment),
});

// --- counterparties ---

export async function getCounterparties(): Promise<Counterparty[]> {
  const items = await getAll<RawCounterparty>('/v1/counterparties');
  return items.map(mapCounterparty);
}

export async function createCounterparty(
  payload: CreateCounterpartyPayload,
): Promise<Counterparty> {
  const res = await apiClient.post<RawCounterparty>('/v1/counterparties', payload);
  return mapCounterparty(res.data);
}

export async function updateCounterparty(
  id: number,
  payload: UpdateCounterpartyPayload,
): Promise<Counterparty> {
  const res = await apiClient.patch<RawCounterparty>(`/v1/counterparties/${id}`, payload);
  return mapCounterparty(res.data);
}

export async function deleteCounterparty(id: number): Promise<void> {
  await apiClient.delete(`/v1/counterparties/${id}`);
}

// --- debts ---

export async function getDebts(filters: DebtFilters = {}): Promise<Debt[]> {
  const params: Record<string, unknown> = {};
  if (filters.counterpartyId != null) params.counterparty_id = filters.counterpartyId;
  if (filters.direction) params.direction = filters.direction;
  if (filters.status) params.status = filters.status;
  const items = await getAll<RawDebt>('/v1/debts', params);
  return items.map(mapDebt);
}

export async function getDebt(id: number): Promise<Debt> {
  const res = await apiClient.get<RawDebt>(`/v1/debts/${id}`);
  return mapDebt(res.data);
}

export async function createDebt(payload: CreateDebtPayload): Promise<Debt> {
  const res = await apiClient.post<RawDebt>('/v1/debts', payload);
  return mapDebt(res.data);
}

export async function updateDebt(id: number, payload: UpdateDebtPayload): Promise<Debt> {
  const res = await apiClient.patch<RawDebt>(`/v1/debts/${id}`, payload);
  return mapDebt(res.data);
}

export async function deleteDebt(id: number): Promise<void> {
  await apiClient.delete(`/v1/debts/${id}`);
}

export async function writeOffDebt(id: number): Promise<Debt> {
  const res = await apiClient.post<RawDebt>(`/v1/debts/${id}/write-off`);
  return mapDebt(res.data);
}

export async function restoreDebt(id: number): Promise<Debt> {
  const res = await apiClient.delete<RawDebt>(`/v1/debts/${id}/write-off`);
  return mapDebt(res.data);
}

export async function getSummary(): Promise<DebtSummaryTotals> {
  const res = await apiClient.get<RawSummary>('/v1/debts/summary');
  return {
    totalIOwe: Number(res.data.totalIOwe),
    totalOwedToMe: Number(res.data.totalOwedToMe),
    net: Number(res.data.net),
  };
}

// --- export / import ---

/** Fetch the whole ledger as a portable mizan-debts document (money stays as strings). */
export async function exportDebts(): Promise<DebtExportDocument> {
  const res = await apiClient.get<DebtExportDocument>('/v1/debts/export');
  return res.data;
}

/** Merge a mizan-debts document into the ledger (atomic on the backend). */
export async function importDebts(doc: DebtExportDocument): Promise<DebtImportResult> {
  const res = await apiClient.post<DebtImportResult>('/v1/debts/import', doc);
  return res.data;
}

// --- repayments ---

export async function addRepayment(
  debtId: number,
  payload: CreateRepaymentPayload,
): Promise<Repayment> {
  const res = await apiClient.post<RawRepayment>(`/v1/debts/${debtId}/repayments`, payload);
  return mapRepayment(res.data);
}

export async function updateRepayment(
  debtId: number,
  repaymentId: number,
  payload: UpdateRepaymentPayload,
): Promise<Repayment> {
  const res = await apiClient.patch<RawRepayment>(
    `/v1/debts/${debtId}/repayments/${repaymentId}`,
    payload,
  );
  return mapRepayment(res.data);
}

export async function deleteRepayment(debtId: number, repaymentId: number): Promise<void> {
  await apiClient.delete(`/v1/debts/${debtId}/repayments/${repaymentId}`);
}
