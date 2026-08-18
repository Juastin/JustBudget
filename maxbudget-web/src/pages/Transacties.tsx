import { useEffect, useState } from 'react';
import type { Category, CategoryRule, Transaction } from '../types';
import { currentPayPeriod, payPeriodLabel } from '../types';
import { getTransactions, updateTransactionCategory, setTransactionRecurring } from '../services/transactionService';
import { getCategories, getRules, createRule, deleteRule, applyRuleToAll } from '../services/categoryService';
import TransactionTable from '../components/TransactionTable';
import CategorySelectModal from '../components/CategorySelectModal';
import PdfImportModal from '../components/PdfImportModal';
import PeriodSelector from '../components/PeriodSelector';

type Tab = 'transacties' | 'regels';

export default function Transacties() {
  const [period, setPeriod] = useState(currentPayPeriod);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('transacties');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [newKeyword, setNewKeyword] = useState('');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState<number | ''>('');
  const [pendingApplyRule, setPendingApplyRule] = useState<{ id: number; keyword: string } | null>(null);
  const [applyingRule, setApplyingRule] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getTransactions(period.year, period.month), getCategories(), getRules()])
      .then(([t, c, r]) => {
        setTransactions(t);
        setCategories(c);
        setRules(r);
      })
      .finally(() => setLoading(false));
  }, [period.year, period.month]);

  async function handleToggleRecurring(transaction: Transaction) {
    const updated = await setTransactionRecurring(transaction.id, !transaction.isRecurring);
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function handleCategorySave(transactionId: number, categoryId: number, shouldCreateRule: boolean) {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const updated = await updateTransactionCategory(transactionId, categoryId, cat.name, cat.color ?? '#6b7280');
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    if (shouldCreateRule) {
      const tx = transactions.find((t) => t.id === transactionId);
      if (tx) {
        const keyword = tx.description.toLowerCase().split(' ')[0];
        const newRule = await createRule(keyword, categoryId, cat.name);
        setRules((prev) => {
          const idx = prev.findIndex((r) => r.id === newRule.id);
          return idx === -1 ? [...prev, newRule] : prev.map((r) => (r.id === newRule.id ? newRule : r));
        });
      }
    }
  }

  async function handleDeleteRule(id: number) {
    await deleteRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAddRule() {
    if (!newKeyword.trim() || newRuleCategoryId === '') return;
    const cat = categories.find((c) => c.id === newRuleCategoryId);
    if (!cat) return;
    const newRule = await createRule(newKeyword.trim(), newRuleCategoryId, cat.name);
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === newRule.id);
      return idx === -1 ? [...prev, newRule] : prev.map((r) => (r.id === newRule.id ? newRule : r));
    });
    setNewKeyword('');
    setNewRuleCategoryId('');
    setPendingApplyRule({ id: newRule.id, keyword: newRule.keyword });
  }

  async function handleApplyRuleToAll() {
    if (!pendingApplyRule) return;
    setApplyingRule(true);
    try {
      await applyRuleToAll(pendingApplyRule.id);
      const updated = await getTransactions(period.year, period.month);
      setTransactions(updated);
    } finally {
      setApplyingRule(false);
      setPendingApplyRule(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'transacties', label: 'Transacties' },
    { key: 'regels', label: 'Categorieregels' },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transacties</h1>
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
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            PDF importeren
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'transacties' && (
        <TransactionTable
          transactions={transactions}
          categories={categories}
          onChangeCategory={setSelectedTransaction}
          onToggleRecurring={handleToggleRecurring}
        />
      )}

      {activeTab === 'regels' && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Nieuwe regel toevoegen</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Trefwoord (bijv. albert heijn)"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={newRuleCategoryId}
                onChange={(e) => setNewRuleCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Selecteer categorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAddRule}
                disabled={!newKeyword.trim() || newRuleCategoryId === ''}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                + Regel toevoegen
              </button>
            </div>
          </div>

          {pendingApplyRule && (
            <div className="flex items-center justify-between gap-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl px-5 py-4 mb-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Regel <span className="font-mono font-semibold">"{pendingApplyRule.keyword}"</span> aangemaakt. Wil je deze ook toepassen op alle bestaande transacties?
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleApplyRuleToAll}
                  disabled={applyingRule}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {applyingRule ? 'Bezig...' : 'Ja, toepassen'}
                </button>
                <button
                  onClick={() => setPendingApplyRule(null)}
                  disabled={applyingRule}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 transition-colors"
                >
                  Nee
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trefwoord</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acties</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {rules.map((rule) => {
                  const cat = categories.find((c) => c.id === rule.categoryId);
                  return (
                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{rule.keyword}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: cat?.color ?? '#6b7280' }}
                        >
                          {rule.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          title="Verwijderen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rules.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                Nog geen regels aangemaakt
              </div>
            )}
          </div>
        </div>
      )}

      <CategorySelectModal
        isOpen={selectedTransaction !== null}
        transaction={selectedTransaction}
        categories={categories}
        onClose={() => setSelectedTransaction(null)}
        onSave={handleCategorySave}
      />

      <PdfImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          getTransactions(period.year, period.month).then(setTransactions);
        }}
      />
    </div>
  );
}
