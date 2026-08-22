export interface Category {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: number;
}

export interface BudgetStatus {
  budgetId: number;
  categoryId: number;
  category: string;
  color?: string;
  budget: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
  percentage: number;
  previousSpent: number;
  delta: number;
}

export interface BudgetSummary {
  salary: number;
  totalBudget: number;
  totalSpent: number;
  leftover: number;
  periodStart: string;
  periodEnd: string;
  latestTransactionDate: string | null;
  previousTotalSpent: number;
}

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  transactionDate: string;
  categoryId?: number;
  categoryName?: string;
  color?: string;
  hash: string;
  isRecurring?: boolean;
  recurringPeriod?: 'monthly' | 'yearly';
  recurringHint?: boolean;
}

export interface ReservationTransaction extends Transaction {
  monthlyReservation: number;
}

export interface ReservationsResult {
  transactions: ReservationTransaction[];
  totalMonthlyReservation: number;
}

export interface CategoryRule {
  id: number;
  keyword: string;
  categoryId: number;
  categoryName: string;
}

export type ReservationType = 'afschrijving' | 'terugkerend' | 'eenmalig';

export interface Reservation {
  id: number;
  name: string;
  type: ReservationType;
  category: string;
  amount: number;
  residualValue: number | null;
  intervalMonths: number;
  startDate: string | null;
  savedAmount: number;
  monthlyAmount: number;
  progress: number | null;
  progressLabel: string | null;
}

export interface ReservationCategory {
  category: string;
  monthlyAmount: number;
  items: Reservation[];
}

export interface ReservationSummary {
  totalMonthly: number;
  byCategory: ReservationCategory[];
}

export type InsightType = 'success' | 'warning' | 'danger' | 'info';

export interface QuickInsight {
  id: number;
  type: InsightType;
  message: string;
}

export function formatEuro(amount: number): string {
  return amount.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function currentPayPeriod(): { year: number; month: number } {
  const now = new Date();
  if (now.getDate() >= 20) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
}

export function payPeriodLabel(year: number, month: number): string {
  const start = new Date(year, month - 1, 20);
  const end = new Date(year, month, 19);
  const startStr = start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  const endStr = end.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}
