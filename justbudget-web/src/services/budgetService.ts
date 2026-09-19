import type { Budget, BudgetAverage, BudgetStatus, BudgetSummary } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function periodParams(periodStart?: string): string {
  return periodStart ? `?periodStart=${periodStart}` : '';
}

export function getBudgetSummary(periodStart?: string): Promise<BudgetSummary> {
  return apiFetch<BudgetSummary>(`api/budget-summary${periodParams(periodStart)}`);
}

export function getBudgetStatus(periodStart?: string): Promise<BudgetStatus[]> {
  return apiFetch<BudgetStatus[]>(`api/budget-status${periodParams(periodStart)}`);
}

export function getBudgets(): Promise<Budget[]> {
  return apiFetch<Budget[]>('api/budgets');
}

export function getBudgetAverages(year?: number): Promise<BudgetAverage[]> {
  return apiFetch<BudgetAverage[]>(`api/budget-averages${year !== undefined ? `?year=${year}` : ''}`);
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
