import type { BudgetStatus, BudgetSummary, Category, CategoryRule, QuickInsight, Transaction } from '../types';

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Hypotheek', color: '#3b82f6' },
  { id: 2, name: 'Boodschappen', color: '#22c55e' },
  { id: 3, name: 'Elektriciteit', color: '#eab308' },
  { id: 4, name: 'Gas', color: '#f97316' },
  { id: 5, name: 'Internet', color: '#8b5cf6' },
  { id: 6, name: 'Mobiele telefoon', color: '#ec4899' },
  { id: 7, name: 'Kinderopvang', color: '#f43f5e' },
  { id: 8, name: 'Uit eten', color: '#f59e0b' },
  { id: 9, name: 'Brandstof', color: '#ef4444' },
  { id: 10, name: 'Winkelen', color: '#6366f1' },
  { id: 11, name: 'Entertainment', color: '#14b8a6' },
  { id: 12, name: 'Salaris', color: '#10b981' },
];

export const BUDGET_STATUS: BudgetStatus[] = [
  { budgetId: 1, categoryId: 1, category: 'Hypotheek', color: '#3b82f6', budget: 1200, spent: 1200, remaining: 0, overBudget: false, percentage: 100, previousSpent: 0, delta: 0, notifyPaid: true, warnThreshold: null },
  { budgetId: 2, categoryId: 2, category: 'Boodschappen', color: '#22c55e', budget: 600, spent: 522, remaining: 78, overBudget: false, percentage: 87, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 3, categoryId: 3, category: 'Elektriciteit', color: '#eab308', budget: 150, spent: 142, remaining: 8, overBudget: false, percentage: 94.7, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 4, categoryId: 4, category: 'Gas', color: '#f97316', budget: 120, spent: 85, remaining: 35, overBudget: false, percentage: 70.8, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 5, categoryId: 5, category: 'Internet', color: '#8b5cf6', budget: 55, spent: 55, remaining: 0, overBudget: false, percentage: 100, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 6, categoryId: 6, category: 'Mobiele telefoon', color: '#ec4899', budget: 45, spent: 45, remaining: 0, overBudget: false, percentage: 100, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 7, categoryId: 7, category: 'Kinderopvang', color: '#f43f5e', budget: 900, spent: 900, remaining: 0, overBudget: false, percentage: 100, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 8, categoryId: 8, category: 'Uit eten', color: '#f59e0b', budget: 200, spent: 125, remaining: 75, overBudget: false, percentage: 62.5, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 9, categoryId: 9, category: 'Brandstof', color: '#ef4444', budget: 180, spent: 137, remaining: 43, overBudget: false, percentage: 76.1, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 10, categoryId: 10, category: 'Winkelen', color: '#6366f1', budget: 150, spent: 183, remaining: -33, overBudget: true, percentage: 122, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
  { budgetId: 11, categoryId: 11, category: 'Entertainment', color: '#14b8a6', budget: 60, spent: 42.98, remaining: 17.02, overBudget: false, percentage: 71.6, previousSpent: 0, delta: 0, notifyPaid: false, warnThreshold: 80 },
];

export const BUDGET_SUMMARY: BudgetSummary = {
  salary: 4200,
  totalBudget: 3660,
  totalSpent: 3436.98,
  leftover: 763.02,
  periodStart: '2026-07-20',
  periodEnd: '2026-08-19',
  latestTransactionDate: null,
  previousTotalSpent: 0,
};

export const TRANSACTIONS: Transaction[] = [
  { id: 1, description: 'Salaris augustus - Info Support B.V.', amount: 4200.00, transactionDate: '2026-08-01', categoryId: 12, categoryName: 'Salaris', color: '#10b981', hash: 'hash_001', isRecurring: true },
  { id: 2, description: 'Hypotheek Rabobank', amount: -1200.00, transactionDate: '2026-08-01', categoryId: 1, categoryName: 'Hypotheek', color: '#3b82f6', hash: 'hash_002', isRecurring: true },
  { id: 3, description: 'Albert Heijn', amount: -87.50, transactionDate: '2026-08-02', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_003' },
  { id: 4, description: 'Essent Energie', amount: -142.00, transactionDate: '2026-08-02', categoryId: 3, categoryName: 'Elektriciteit', color: '#eab308', hash: 'hash_004', isRecurring: true },
  { id: 5, description: 'Ziggo Internet', amount: -55.00, transactionDate: '2026-08-02', categoryId: 5, categoryName: 'Internet', color: '#8b5cf6', hash: 'hash_005', isRecurring: true },
  { id: 6, description: 'T-Mobile Nederland', amount: -45.00, transactionDate: '2026-08-03', categoryId: 6, categoryName: 'Mobiele telefoon', color: '#ec4899', hash: 'hash_006', isRecurring: true },
  { id: 7, description: 'Jumbo Supermarkt', amount: -68.45, transactionDate: '2026-08-03', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_007' },
  { id: 8, description: 'Shell Amsterdam Centrum', amount: -78.20, transactionDate: '2026-08-04', categoryId: 9, categoryName: 'Brandstof', color: '#ef4444', hash: 'hash_008' },
  { id: 9, description: 'Bol.com', amount: -54.99, transactionDate: '2026-08-05', categoryId: 10, categoryName: 'Winkelen', color: '#6366f1', hash: 'hash_009' },
  { id: 10, description: 'Netflix', amount: -17.99, transactionDate: '2026-08-05', categoryId: 11, categoryName: 'Entertainment', color: '#14b8a6', hash: 'hash_010', isRecurring: true },
  { id: 11, description: 'KFC Amsterdam', amount: -28.50, transactionDate: '2026-08-06', categoryId: 8, categoryName: 'Uit eten', color: '#f59e0b', hash: 'hash_011' },
  { id: 12, description: 'Kinderopvang De Zonnewijzer', amount: -900.00, transactionDate: '2026-08-07', categoryId: 7, categoryName: 'Kinderopvang', color: '#f43f5e', hash: 'hash_012', isRecurring: true },
  { id: 13, description: 'Eneco Gas', amount: -85.00, transactionDate: '2026-08-08', categoryId: 4, categoryName: 'Gas', color: '#f97316', hash: 'hash_013', isRecurring: true },
  { id: 14, description: 'Albert Heijn', amount: -63.18, transactionDate: '2026-08-09', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_014' },
  { id: 15, description: 'ZARA Online', amount: -69.50, transactionDate: '2026-08-10', categoryId: 10, categoryName: 'Winkelen', color: '#6366f1', hash: 'hash_015' },
  { id: 16, description: 'Spotify', amount: -10.99, transactionDate: '2026-08-10', categoryId: 11, categoryName: 'Entertainment', color: '#14b8a6', hash: 'hash_016', isRecurring: true },
  { id: 17, description: 'Shell Rotterdam', amount: -58.80, transactionDate: '2026-08-11', categoryId: 9, categoryName: 'Brandstof', color: '#ef4444', hash: 'hash_017' },
  { id: 18, description: "McDonald's", amount: -23.45, transactionDate: '2026-08-12', categoryId: 8, categoryName: 'Uit eten', color: '#f59e0b', hash: 'hash_018' },
  { id: 19, description: 'Albert Heijn', amount: -91.30, transactionDate: '2026-08-12', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_019' },
  { id: 20, description: 'H&M Online', amount: -58.51, transactionDate: '2026-08-14', categoryId: 10, categoryName: 'Winkelen', color: '#6366f1', hash: 'hash_020' },
  { id: 21, description: 'Pathé Cinema Amsterdam', amount: -14.00, transactionDate: '2026-08-15', categoryId: 11, categoryName: 'Entertainment', color: '#14b8a6', hash: 'hash_021' },
  { id: 22, description: 'Jumbo Weekboodschappen', amount: -74.22, transactionDate: '2026-08-15', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_022' },
  { id: 23, description: 'De Pizzabakkers', amount: -73.05, transactionDate: '2026-08-16', categoryId: 8, categoryName: 'Uit eten', color: '#f59e0b', hash: 'hash_023' },
  { id: 24, description: 'Poiesz Supermarkt', amount: -52.30, transactionDate: '2026-08-17', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_024' },
  { id: 25, description: 'Albert Heijn', amount: -85.05, transactionDate: '2026-08-18', categoryId: 2, categoryName: 'Boodschappen', color: '#22c55e', hash: 'hash_025' },
];

export const CATEGORY_RULES: CategoryRule[] = [
  { id: 1, keyword: 'albert heijn', categoryId: 2, categoryName: 'Boodschappen' },
  { id: 2, keyword: 'jumbo', categoryId: 2, categoryName: 'Boodschappen' },
  { id: 3, keyword: 'netflix', categoryId: 11, categoryName: 'Entertainment' },
  { id: 4, keyword: 'shell', categoryId: 9, categoryName: 'Brandstof' },
  { id: 5, keyword: 'spotify', categoryId: 11, categoryName: 'Entertainment' },
  { id: 6, keyword: 'kinderopvang', categoryId: 7, categoryName: 'Kinderopvang' },
];

export const QUICK_INSIGHTS: QuickInsight[] = [
  { id: 1, type: 'danger', message: 'Winkelen heeft het budget overschreden met € 33,00' },
  { id: 2, type: 'warning', message: 'Boodschappen heeft 87% van het budget gebruikt' },
  { id: 3, type: 'warning', message: 'Elektriciteit zit op 95% van het budget' },
  { id: 4, type: 'success', message: 'Hypotheek is succesvol betaald' },
  { id: 5, type: 'info', message: 'Je hebt nog € 763,02 over deze maand' },
];
