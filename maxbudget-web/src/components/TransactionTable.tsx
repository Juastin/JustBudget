import { useMemo, useState } from 'react';
import type { Category, Transaction } from '../types';
import { formatDate, formatEuro } from '../types';
import CategoryBadge from './CategoryBadge';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onChangeCategory: (transaction: Transaction) => void;
  onToggleRecurring?: (transaction: Transaction) => void;
}

export default function TransactionTable({ transactions, categories, onChangeCategory, onToggleRecurring }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategoryId === '' ||
        (selectedCategoryId === 'none' ? !t.categoryId : String(t.categoryId) === selectedCategoryId);
      return matchesSearch && matchesCategory;
    });
  }, [transactions, search, selectedCategoryId]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Zoeken op omschrijving..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">Alle categorieën</option>
          <option value="none">Niet gecategoriseerd</option>
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Datum</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Omschrijving</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bedrag</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categorie</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acties</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.transactionDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white">{t.description}</span>
                    {t.isRecurring && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                        Terugkerend
                      </span>
                    )}
                    {t.recurringHint && !t.isRecurring && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                        Hint
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatEuro(t.amount)}
                </td>
                <td className="px-4 py-3">
                  {t.categoryName ? (
                    <CategoryBadge name={t.categoryName} color={t.color} />
                  ) : (
                    <span className="text-xs italic text-gray-400">Niet gecategoriseerd</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onChangeCategory(t)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                  >
                    Wijzigen
                  </button>
                  {onToggleRecurring && t.amount < 0 && (
                    <button
                      onClick={() => onToggleRecurring(t)}
                      title={t.isRecurring ? 'Verwijder terugkerend' : 'Markeer als terugkerend'}
                      className={`text-xs ml-2 font-medium transition-colors ${t.isRecurring ? 'text-teal-600 dark:text-teal-400 hover:text-red-500' : 'text-gray-400 hover:text-teal-600 dark:hover:text-teal-400'}`}
                    >
                      {t.isRecurring ? '↩ Niet terugkerend' : '↺ Terugkerend'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            Geen transacties gevonden
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{filtered.length} transactie{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
