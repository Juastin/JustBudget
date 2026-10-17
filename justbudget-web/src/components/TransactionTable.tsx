import { Fragment, useMemo, useState } from 'react';
import type { Category, Transaction } from '../types';
import { formatDate, formatEuro } from '../types';
import CategoryBadge from './CategoryBadge';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onChangeCategory: (transaction: Transaction) => void;
  onToggleRecurring?: (transaction: Transaction) => void;
  onLink?: (transaction: Transaction) => void;
  onUnlink?: (transaction: Transaction) => void;
}

function netAmount(t: Transaction): number {
  if (t.reimbursedTotal == null) return t.amount;
  return Math.round((t.amount + t.reimbursedTotal) * 100) / 100;
}

function groupReimbursements(reimbursements: Transaction[]) {
  const map = new Map<number, number>();
  reimbursements.forEach((r) => {
    const cents = Math.round(r.amount * 100);
    map.set(cents, (map.get(cents) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([cents, count]) => ({ amount: cents / 100, count }))
    .sort((a, b) => b.count - a.count);
}

export default function TransactionTable({ transactions, categories, onChangeCategory, onToggleRecurring, onLink, onUnlink }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function toggleExpanded(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategoryId === '' ||
        (selectedCategoryId === 'none' ? !t.categoryId : String(t.categoryId) === selectedCategoryId);
      return matchesSearch && matchesCategory;
    });
  }, [transactions, search, selectedCategoryId]);

  const reimbursementsByExpense = useMemo(() => {
    const map = new Map<number, Transaction[]>();
    transactions.forEach((t) => {
      if (t.linkedExpenseId != null) {
        const arr = map.get(t.linkedExpenseId) ?? [];
        arr.push(t);
        map.set(t.linkedExpenseId, arr);
      }
    });
    return map;
  }, [transactions]);

  const filteredIds = useMemo(() => new Set(filtered.map((t) => t.id)), [filtered]);
  const topLevel = filtered.filter((t) => t.linkedExpenseId == null || !filteredIds.has(t.linkedExpenseId));

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
            {topLevel.map((t) => (
              <Fragment key={t.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white">{t.description}</span>
                      {t.isRecurring && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300">
                          Terugkerend
                        </span>
                      )}
                      {t.linkedExpenseId != null && (
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                          title={t.linkedExpenseDescription ? `Gekoppeld aan: ${t.linkedExpenseDescription}` : 'Gekoppeld'}
                        >
                          🔗 Gekoppeld
                        </span>
                      )}
                    </div>
                    {(() => {
                      const reimbursements = reimbursementsByExpense.get(t.id) ?? [];
                      if (reimbursements.length === 0) return null;
                      const groups = groupReimbursements(reimbursements);
                      const expanded = expandedIds.has(t.id);
                      return (
                        <button
                          onClick={() => toggleExpanded(t.id)}
                          className="mt-1.5 flex flex-wrap items-center gap-1.5"
                          title={expanded ? 'Verberg terugbetalingen' : 'Toon terugbetalingen'}
                        >
                          {groups.map((g, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                            >
                              +{formatEuro(g.amount)}{g.count > 1 ? ` × ${g.count}` : ''}
                            </span>
                          ))}
                          <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
                        </button>
                      );
                    })()}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${netAmount(t) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {t.reimbursedTotal != null ? (
                      <span className="inline-flex items-baseline gap-1.5">
                        <span className="font-normal text-gray-400 dark:text-gray-500 line-through">{formatEuro(t.amount)}</span>
                        <span>{formatEuro(netAmount(t))}</span>
                      </span>
                    ) : (
                      formatEuro(t.amount)
                    )}
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
                    {onLink && t.amount > 0 && t.linkedExpenseId == null && (
                      <button
                        onClick={() => onLink(t)}
                        title="Koppel aan een uitgave"
                        className="text-xs ml-2 font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                      >
                        🔗 Koppelen
                      </button>
                    )}
                    {onUnlink && t.linkedExpenseId != null && (
                      <button
                        onClick={() => onUnlink(t)}
                        title="Ontkoppel van uitgave"
                        className="text-xs ml-2 font-medium text-gray-400 hover:text-red-500"
                      >
                        Ontkoppelen
                      </button>
                    )}
                  </td>
                </tr>
                {expandedIds.has(t.id) && (reimbursementsByExpense.get(t.id) ?? []).map((r) => (
                  <tr key={r.id} className="bg-gray-50/60 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-2 text-gray-400 dark:text-gray-500 whitespace-nowrap text-xs">{formatDate(r.transactionDate)}</td>
                    <td className="px-4 py-2 pl-8 text-xs text-gray-500 dark:text-gray-400">
                      ↳ {r.description}
                    </td>
                    <td className="px-4 py-2 text-right text-xs font-medium whitespace-nowrap text-green-600 dark:text-green-400">
                      {formatEuro(r.amount)}
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2">
                      {onUnlink && (
                        <button
                          onClick={() => onUnlink(r)}
                          title="Ontkoppel van uitgave"
                          className="text-xs font-medium text-gray-400 hover:text-red-500"
                        >
                          Ontkoppelen
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </Fragment>
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
