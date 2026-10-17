import { useMemo, useState } from 'react';
import type { Transaction } from '../types';
import { formatDate, formatEuro } from '../types';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  expenses: Transaction[];
  onClose: () => void;
  onLink: (transactionId: number, expenseId: number) => Promise<void>;
}

export default function LinkExpenseModal({ isOpen, transaction, expenses, onClose, onLink }: Props) {
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);

  const filtered = useMemo(
    () => expenses.filter((e) => e.description.toLowerCase().includes(search.toLowerCase())),
    [expenses, search],
  );

  if (!isOpen || !transaction) return null;

  async function handleLink(expenseId: number) {
    if (!transaction) return;
    setSavingId(expenseId);
    try {
      await onLink(transaction.id, expenseId);
      onClose();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Koppelen aan uitgave</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
          {transaction.description} · {formatEuro(transaction.amount)}
        </p>

        <input
          type="text"
          placeholder="Zoeken op omschrijving..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-4"
        />

        <div className="overflow-y-auto flex-1 -mx-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 px-2 py-4 text-center">Geen uitgaven gevonden</p>
          )}
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => handleLink(e.id)}
              disabled={savingId !== null}
              className="w-full flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-left disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block text-sm text-gray-900 dark:text-white truncate">{e.description}</span>
                <span className="block text-xs text-gray-400">{formatDate(e.transactionDate)}</span>
              </span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                {savingId === e.id ? 'Koppelen...' : formatEuro(e.amount)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
