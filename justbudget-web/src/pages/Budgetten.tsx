import { useEffect, useState } from 'react';
import type { BudgetAverage, BudgetStatus } from '../types';
import { formatEuro, currentPayPeriod, payPeriodLabel } from '../types';
import { getBudgetAverages, getBudgetStatus, updateBudget } from '../services/budgetService';
import { createCategory, deleteCategory, updateCategory } from '../services/categoryService';
import BudgetCard from '../components/BudgetCard';
import BudgetEditModal from '../components/BudgetEditModal';
import CategoryCreateModal from '../components/CategoryCreateModal';
import PeriodSelector from '../components/PeriodSelector';

export default function Budgetten() {
  const [period, setPeriod] = useState(currentPayPeriod);
  const [statuses, setStatuses] = useState<BudgetStatus[]>([]);
  const [averages, setAverages] = useState<BudgetAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<BudgetStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [data, avg] = await Promise.all([
        getBudgetStatus(period.year, period.month),
        getBudgetAverages(period.year),
      ]);
      setStatuses(data);
      setAverages(avg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [period.year, period.month]);

  const averageByCategory = new Map(averages.map((a) => [a.categoryId, a]));

  async function handleSave(budgetId: number, amount: number, name: string, notifyPaid: boolean, warnThreshold: number | null) {
    const status = statuses.find((s) => s.budgetId === budgetId);
    await Promise.all([
      updateBudget(budgetId, { amount, notifyPaid, warnThreshold }),
      status && name !== status.category ? updateCategory(status.categoryId, { name }) : Promise.resolve(),
    ]);
    const updated = await getBudgetStatus(period.year, period.month);
    setStatuses(updated);
  }

  async function handleDelete(categoryId: number) {
    await deleteCategory(categoryId);
    setStatuses((prev) => prev.filter((s) => s.categoryId !== categoryId));
  }

  function handleEdit(budgetId: number) {
    setEditingStatus(statuses.find((s) => s.budgetId === budgetId) ?? null);
  }

  async function handleCreate(name: string, color: string, budgetAmount: number) {
    await createCategory(name, color, budgetAmount);
    await load();
  }

  const totalBudget = statuses.reduce((sum, s) => sum + s.budget, 0);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-52 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgetten</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {payPeriodLabel(period.year, period.month)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector
            year={period.year}
            month={period.month}
            onChange={(year, month) => setPeriod({ year, month })}
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nieuwe categorie
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Totaal budget: </span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatEuro(totalBudget)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Uitgegeven: </span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatEuro(totalSpent)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Resterend: </span>
          <span className={`font-semibold ${totalRemaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatEuro(totalRemaining)}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Over budget: </span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {statuses.filter((s) => s.overBudget).length} categorie{statuses.filter((s) => s.overBudget).length !== 1 ? 'ën' : ''}
          </span>
        </div>
      </div>

      {statuses.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Geen categorieën gevonden</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Voeg een categorie toe om te beginnen</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Nieuwe categorie aanmaken
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {statuses.map((s) => (
            <BudgetCard
              key={s.budgetId}
              status={s}
              average={averageByCategory.get(s.categoryId) ?? null}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <BudgetEditModal
        isOpen={editingStatus !== null}
        budgetId={editingStatus?.budgetId ?? null}
        categoryName={editingStatus?.category ?? ''}
        currentAmount={editingStatus?.budget ?? 0}
        currentNotifyPaid={editingStatus?.notifyPaid ?? false}
        currentWarnThreshold={editingStatus?.warnThreshold ?? null}
        onClose={() => setEditingStatus(null)}
        onSave={handleSave}
      />

      <CategoryCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
