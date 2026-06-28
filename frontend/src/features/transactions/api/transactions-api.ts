/* Transactions API — the current month's ledger entries.

   Mock-backed for now; swap each body for the commented Axios call later. */
import { db } from '@/lib/mock/db';
import { mockRequest } from '@/lib/mock/mock-request';
import type { Transaction } from '@/types';

export type NewTransaction = Omit<Transaction, 'id'>;

export function getTransactions(): Promise<Transaction[]> {
  // return apiClient.get('/transactions').then((r) => r.data);
  return mockRequest(() => db.transactions);
}

export function addTransaction(input: NewTransaction): Promise<Transaction> {
  // return apiClient.post('/transactions', input).then((r) => r.data);
  return mockRequest(() => {
    const id = db.transactions.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const created: Transaction = { id, ...input };
    db.transactions.push(created);
    return created;
  });
}

export function updateTransactionAmount(id: number, amount: number): Promise<Transaction> {
  // return apiClient.patch(`/transactions/${id}`, { amount }).then((r) => r.data);
  return mockRequest(() => {
    const tx = db.transactions.find((t) => t.id === id);
    if (!tx) throw new Error(`Transaction ${id} not found`);
    tx.amount = amount;
    return tx;
  });
}
