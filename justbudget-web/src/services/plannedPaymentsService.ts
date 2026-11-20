import type { PlannedPayment, PlannedPaymentCandidate } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getPlannedPayments(): Promise<PlannedPayment[]> {
  return apiFetch<PlannedPayment[]>('api/planned-payments');
}

export function getPlannedPaymentsInPeriod(periodStart?: string): Promise<PlannedPayment[]> {
  const query = periodStart ? `?periodStart=${periodStart}` : '';
  return apiFetch<PlannedPayment[]>(`api/planned-payments/period${query}`);
}

export function getPlannedPaymentCandidates(id: number, search?: string): Promise<PlannedPaymentCandidate[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiFetch<PlannedPaymentCandidate[]>(`api/planned-payments/${id}/candidates${query}`);
}

export function createPlannedPayment(data: { name: string; amount: number; dueDate: string }): Promise<PlannedPayment> {
  return apiFetch<PlannedPayment>('api/planned-payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function settlePlannedPayment(id: number, transactionId: number): Promise<void> {
  const res = await fetch(`api/planned-payments/${id}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId }),
  });
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
}

export async function deletePlannedPayment(id: number): Promise<void> {
  const res = await fetch(`api/planned-payments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
}
