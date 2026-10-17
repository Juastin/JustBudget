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
  notifyPaid: boolean;
  warnThreshold: number | null;
}

export interface BudgetAverage {
  categoryId: number;
  category: string;
  average: number | null;
  monthsCounted: number;
}

export interface BudgetSummary {
  salary: number;
  totalBudget: number;
  totalSpent: number;
  leftover: number;
  periodStart: string;
  periodEnd: string | null;
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
  isProjected?: boolean;
  linkedExpenseId?: number;
  linkedExpenseDescription?: string;
  reimbursedTotal?: number;
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

export interface PeriodRange {
  start: string;
  end: string | null;
}

export type PeriodMode = 'FIXED_DAY' | 'TRANSACTION';

export interface PeriodSettings {
  mode: PeriodMode;
  anchorDay: number;
  triggerDescription: string | null;
}

export interface TriggerCandidate {
  key: string;
  description: string;
  lastDate: string;
  lastAmount: number;
  count: number;
}

export interface PeriodInfo {
  originalStart: string;
  start: string;
  end: string | null;
  transactionCount: number;
  hasAdjustment: boolean;
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

export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function payPeriodLabel(start: string, end: string | null): string {
  const startStr = parseISODate(start).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  if (!end) return `${startStr} – heden`;
  const endStr = parseISODate(end).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}
