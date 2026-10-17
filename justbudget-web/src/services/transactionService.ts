import type { ReservationsResult, Transaction } from '../types';

export interface RecurringResult {
  transactions: Transaction[];
  total: number;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getTransactions(periodStart?: string): Promise<Transaction[]> {
  const query = periodStart ? `?periodStart=${periodStart}` : '';
  return apiFetch<Transaction[]>(`api/transactions${query}`);
}

export function getRecurringTransactions(periodStart?: string): Promise<RecurringResult> {
  const query = periodStart ? `?periodStart=${periodStart}` : '';
  return apiFetch<RecurringResult>(`api/transactions/recurring${query}`);
}

export function setTransactionRecurring(id: number, isRecurring: boolean, period?: 'monthly' | 'yearly'): Promise<Transaction> {
  return apiFetch<Transaction>(`api/transactions/${id}/recurring`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isRecurring, ...(period ? { period } : {}) }),
  });
}

export function setTransactionPeriod(id: number, period: 'monthly' | 'yearly'): Promise<Transaction> {
  return apiFetch<Transaction>(`api/transactions/${id}/period`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  });
}

export function getYearlyReservations(): Promise<ReservationsResult> {
  return apiFetch<ReservationsResult>('api/transactions/reservations');
}

export function getProjectedRecurring(periodStart?: string): Promise<Transaction[]> {
  const query = periodStart ? `?periodStart=${periodStart}` : '';
  return apiFetch<Transaction[]>(`api/transactions/projected${query}`);
}

export function linkTransaction(id: number, expenseId: number): Promise<Transaction> {
  return apiFetch<Transaction>(`api/transactions/${id}/link`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenseId }),
  });
}

export function unlinkTransaction(id: number): Promise<Transaction> {
  return apiFetch<Transaction>(`api/transactions/${id}/unlink`, { method: 'PATCH' });
}

export function updateTransactionCategory(
  id: number,
  categoryId: number,
  _categoryName: string,
  _color: string,
): Promise<Transaction> {
  return apiFetch<Transaction>(`api/transactions/${id}/category`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId }),
  });
}
