import { useEffect, useState } from 'react';

interface Props {
  isOpen: boolean;
  budgetId: number | null;
  categoryName: string;
  currentAmount: number;
  onClose: () => void;
  onSave: (budgetId: number, amount: number, name: string) => Promise<void>;
}

export default function BudgetEditModal({ isOpen, budgetId, categoryName, currentAmount, onClose, onSave }: Props) {
  const [name, setName] = useState(categoryName);
  const [amount, setAmount] = useState(currentAmount);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(categoryName);
    setAmount(currentAmount);
  }, [categoryName, currentAmount]);

  if (!isOpen || budgetId === null) return null;

  async function handleSave() {
    if (budgetId === null) return;
    setSaving(true);
    try {
      await onSave(budgetId, amount, name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5">Budget bewerken</h2>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Naam categorie
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Maandelijks budget (€)
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
