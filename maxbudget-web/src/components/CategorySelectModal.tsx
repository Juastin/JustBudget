import { useState } from 'react';
import type { Category, Transaction } from '../types';

interface Props {
  isOpen: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSave: (transactionId: number, categoryId: number, createRule: boolean) => Promise<void>;
}

export default function CategorySelectModal({ isOpen, transaction, categories, onClose, onSave }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>(transaction?.categoryId ?? '');
  const [createRule, setCreateRule] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen || !transaction) return null;

  async function handleSave() {
    if (!transaction || selectedCategoryId === '') return;
    setSaving(true);
    try {
      await onSave(transaction.id, selectedCategoryId, createRule);
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Categorie wijzigen</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 truncate">{transaction.description}</p>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorie</label>
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        >
          <option value="">Selecteer een categorie...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={createRule}
            onChange={(e) => setCreateRule(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Maak een regel aan voor toekomstige transacties
          </span>
        </label>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedCategoryId === ''}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
