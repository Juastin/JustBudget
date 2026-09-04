import type { Budget, BudgetStatus, BudgetSummary } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function periodParams(year?: number, month?: number): string {
  if (year === undefined || month === undefined) return '';
  return `?year=${year}&month=${month}`;
}

export function getBudgetSummary(year?: number, month?: number): Promise<BudgetSummary> {
  return apiFetch<BudgetSummary>(`api/budget-summary${periodParams(year, month)}`);
}

export function getBudgetStatus(year?: number, month?: number): Promise<BudgetStatus[]> {
  return apiFetch<BudgetStatus[]>(`api/budget-status${periodParams(year, month)}`);
}

export function getBudgets(): Promise<Budget[]> {
  return apiFetch<Budget[]>('api/budgets');
}

export interface UpdateBudgetPayload {
  amount: number;
  notifyPaid?: boolean;
  warnThreshold?: number | null;
}

export function updateBudget(budgetId: number, payload: UpdateBudgetPayload): Promise<BudgetStatus> {
  return apiFetch<BudgetStatus>(`api/budgets/${budgetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
