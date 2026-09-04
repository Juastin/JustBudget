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

export function getTransactions(year?: number, month?: number): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (year !== undefined) params.set('year', String(year));
  if (month !== undefined) params.set('month', String(month));
  const query = params.toString();
  return apiFetch<Transaction[]>(`api/transactions${query ? `?${query}` : ''}`);
}

export function getRecurringTransactions(year?: number, month?: number): Promise<RecurringResult> {
  const params = new URLSearchParams();
  if (year !== undefined) params.set('year', String(year));
  if (month !== undefined) params.set('month', String(month));
  const query = params.toString();
  return apiFetch<RecurringResult>(`api/transactions/recurring${query ? `?${query}` : ''}`);
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

export function getProjectedRecurring(year?: number, month?: number): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (year !== undefined) params.set('year', String(year));
  if (month !== undefined) params.set('month', String(month));
  const query = params.toString();
  return apiFetch<Transaction[]>(`api/transactions/projected${query ? `?${query}` : ''}`);
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
