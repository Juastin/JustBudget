import { useState } from 'react';
import type { BudgetAverage, BudgetStatus } from '../types';
import { formatEuro } from '../types';
import ProgressBar from './ProgressBar';

interface Props {
  status: BudgetStatus;
  average?: BudgetAverage | null;
  onEdit: (budgetId: number) => void;
  onDelete: (categoryId: number) => void;
}

export default function BudgetCard({ status, average, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);

  // Gap between the yearly average and the budget, as a % of the budget's size.
  // Using the budget's size (not the raw value) keeps this working the same way
  // for negative budgets (e.g. a category that expects a net refund).
  const avgDiff = average?.average != null ? average.average - status.budget : null;
  const avgDiffPct = avgDiff !== null && status.budget !== 0 ? avgDiff / Math.abs(status.budget) : null;

  if (confirming) {
    return (
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex flex-col justify-center items-center gap-4 min-h-[160px]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color ?? '#6b7280' }} />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{status.category}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Categorie en bijbehorend budget verwijderen?
        </p>
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setConfirming(false)}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={() => onDelete(status.categoryId)}
            className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Verwijderen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
      <div className="absolute top-4 right-4 flex gap-1">
        <button
          onClick={() => onEdit(status.budgetId)}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Budget bewerken"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => setConfirming(true)}
          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Categorie verwijderen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 pr-16">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color ?? '#6b7280' }} />
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{status.category}</h3>
        {status.overBudget && (
          <span className="ml-auto flex-shrink-0 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
            Over budget
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Budget</p>
          <p className="font-semibold text-gray-900 dark:text-white">{formatEuro(status.budget)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Uitgegeven</p>
          <p className="font-semibold text-gray-900 dark:text-white">{formatEuro(status.spent)}</p>
          {status.delta !== 0 && (
            <p className={`text-xs mt-0.5 ${status.delta > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {status.delta > 0 ? '▲' : '▼'} {formatEuro(Math.abs(status.delta))}
            </p>
          )}
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Resterend</p>
          <p className={`font-semibold ${status.overBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatEuro(status.remaining)}
          </p>
        </div>
      </div>

      <ProgressBar percentage={status.percentage} showPercentage height="md" />

      {average && average.average !== null && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>
            Gemiddeld dit jaar: <span className="font-medium text-gray-700 dark:text-gray-300">{formatEuro(average.average)}</span>
            /mnd ({average.monthsCounted} {average.monthsCounted === 1 ? 'maand' : 'maanden'})
          </span>
          {avgDiffPct !== null && avgDiffPct > 0.1 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">▲ {formatEuro(avgDiff!)}</span>
          )}
          {avgDiffPct !== null && avgDiffPct < -0.15 && (
            <span className="text-green-600 dark:text-green-400 font-medium">▼ {formatEuro(-avgDiff!)}</span>
          )}
        </div>
      )}
    </div>
  );
}
