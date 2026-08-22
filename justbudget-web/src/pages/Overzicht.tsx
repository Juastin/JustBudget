import { useEffect, useRef, useState } from 'react';
import type { BudgetStatus, BudgetSummary, ReservationSummary, QuickInsight, ReservationsResult, Transaction } from '../types';
import { formatEuro, currentPayPeriod, payPeriodLabel } from '../types';
import { getBudgetStatus, getBudgetSummary } from '../services/budgetService';
import { getQuickInsights } from '../services/savingsService';
import { getRecurringTransactions, getRecurringHints, getProjectedRecurring, getYearlyReservations, setTransactionPeriod, setTransactionRecurring, type RecurringResult } from '../services/transactionService';
import { getReservationsSummary } from '../services/reservationsService';
import KPICard from '../components/KPICard';
import QuickInsightsList from '../components/QuickInsightsList';
import ProgressBar from '../components/ProgressBar';
import PeriodSelector from '../components/PeriodSelector';

const STORAGE_KEY = 'topUitgavenCategories';
const DEFAULT_SPOTLIGHT = ['Uit eten', 'Boodschappen'];

function loadSpotlight(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_SPOTLIGHT;
}

export default function Overzicht() {
  const [period, setPeriod] = useState(currentPayPeriod);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [insights, setInsights] = useState<QuickInsight[]>([]);
  const [allStatuses, setAllStatuses] = useState<BudgetStatus[]>([]);
  const [recurring, setRecurring] = useState<RecurringResult>({ transactions: [], total: 0 });
  const [projected, setProjected] = useState<Transaction[]>([]);
  const [hints, setHints] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<ReservationsResult>({ transactions: [], totalMonthlyReservation: 0 });
  const [reservationsSummary, setReservationsSummary] = useState<ReservationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotlightCategories, setSpotlightCategories] = useState<string[]>(loadSpotlight);
  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReservationsSummary().then(setReservationsSummary).catch(() => {});
    getYearlyReservations().then(setReservations).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setSummary(null);
    Promise.all([
      getBudgetSummary(period.year, period.month),
      getQuickInsights(period.year, period.month),
      getBudgetStatus(period.year, period.month),
      getRecurringTransactions(period.year, period.month),
      getRecurringHints(period.year, period.month),
      getProjectedRecurring(period.year, period.month),
    ])
      .then(([s, i, statuses, rec, h, proj]) => {
        setSummary(s);
        setInsights(i);
        setAllStatuses(statuses);
        setRecurring(rec);
        setHints(h);
        setProjected(proj);
      })
      .finally(() => setLoading(false));
  }, [period.year, period.month]);

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editing]);

  function toggleCategory(name: string) {
    const next = spotlightCategories.includes(name)
      ? spotlightCategories.filter((c) => c !== name)
      : [...spotlightCategories, name];
    setSpotlightCategories(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const spotlightStatuses = allStatuses
    .filter((s) => spotlightCategories.includes(s.category))
    .sort((a, b) => b.spent - a.spent);

  const projectedTotal = projected.reduce((s, t) => s + Math.abs(t.amount), 0);
  const displayTotalSpent = summary ? summary.totalSpent + projectedTotal : 0;
  const displayLeftover = summary ? summary.leftover - projectedTotal : 0;

  const budgetBenutPct = summary && summary.totalBudget > 0
    ? Math.round((displayTotalSpent / summary.totalBudget) * 100)
    : 0;

  async function handleToggleRecurring(id: number) {
    await setTransactionRecurring(id, false);
    setRecurring((prev) => ({ transactions: prev.transactions.filter((t) => t.id !== id), total: prev.transactions.filter((t) => t.id !== id).reduce((s, t) => s + t.amount, 0) }));
    setReservations((prev) => { const next = prev.transactions.filter((t) => t.id !== id); return { transactions: next, totalMonthlyReservation: next.reduce((s, t) => s + t.monthlyReservation, 0) }; });
  }

  async function handleTogglePeriod(id: number, currentPeriod: 'monthly' | 'yearly') {
    const newPeriod = currentPeriod === 'monthly' ? 'yearly' : 'monthly';
    await setTransactionPeriod(id, newPeriod);
    const [newRec, newRes] = await Promise.all([
      getRecurringTransactions(period.year, period.month),
      getYearlyReservations(),
    ]);
    setRecurring(newRec);
    setReservations(newRes);
  }

  async function handleConfirmHint(id: number) {
    const updated = await setTransactionRecurring(id, true);
    setHints((prev) => prev.filter((h) => h.id !== id));
    setRecurring((prev) => {
      const newTransactions = [...prev.transactions, updated];
      return {
        transactions: newTransactions,
        total: newTransactions.reduce((s, t) => s + t.amount, 0),
      };
    });
  }

  async function handleDismissHint(id: number) {
    await setTransactionRecurring(id, false);
    setHints((prev) => prev.filter((h) => h.id !== id));
  }

  function formatShort(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  }

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Overzicht</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {payPeriodLabel(period.year, period.month)}
          </p>
        </div>
        <PeriodSelector
          year={period.year}
          month={period.month}
          onChange={(year, month) => setPeriod({ year, month })}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KPICard
          label="Inkomen"
          value={summary ? formatEuro(summary.salary) : '—'}
          subtitle={summary ? `Salaris t/m ${formatShort(summary.periodEnd)}` : undefined}
          variant="success"
        />
        <KPICard
          label="Totaal uitgegeven"
          value={summary ? formatEuro(displayTotalSpent) : '—'}
          variant="default"
          subtitleNode={
            <span className="flex flex-col gap-0.5">
              {projectedTotal > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  incl. {formatEuro(projectedTotal)} voorspeld terugkerend
                </span>
              )}
              {summary && summary.previousTotalSpent > 0 && (
                <span className={
                  displayTotalSpent > summary.previousTotalSpent
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }>
                  {displayTotalSpent > summary.previousTotalSpent ? '▲' : '▼'}{' '}
                  {formatEuro(Math.abs(displayTotalSpent - summary.previousTotalSpent))} t.o.v. vorige maand
                </span>
              )}
            </span>
          }
        />
        {(() => {
          const reservatieAmt = reservationsSummary?.totalMonthly ?? 0;
          const jaarresAmt = reservations.totalMonthlyReservation;
          const adjusted = summary ? displayLeftover - reservatieAmt - jaarresAmt : 0;
          const parts: string[] = [];
          if (reservatieAmt > 0) parts.push(`${formatEuro(reservatieAmt)} reserveringen`);
          if (jaarresAmt > 0) parts.push(`${formatEuro(jaarresAmt)} jaarreserv.`);
          return (
            <KPICard
              label="Resterend"
              value={summary ? formatEuro(adjusted) : '—'}
              variant={summary ? (adjusted < 0 ? 'danger' : 'info') : 'info'}
              subtitleNode={summary && parts.length > 0 ? (
                <span className="text-gray-400 dark:text-gray-500">incl. {parts.join(' + ')}</span>
              ) : undefined}
            />
          );
        })()}
        <KPICard
          label="Budget benut"
          value={`${budgetBenutPct}%`}
          subtitle={summary ? `van ${formatEuro(summary.totalBudget)}` : undefined}
          variant={budgetBenutPct > 100 ? 'danger' : budgetBenutPct >= 80 ? 'warning' : 'default'}
        />
      </div>

      {summary?.latestTransactionDate && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
          Laatste transactie: {new Date(summary.latestTransactionDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Snelle inzichten</h2>
          <QuickInsightsList insights={insights} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top uitgaven</h2>
            <div className="relative" ref={editRef}>
              <button
                onClick={() => setEditing((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                Bewerken
              </button>
              {editing && (
                <div className="absolute right-0 top-6 z-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3 min-w-48">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Categorieën tonen</p>
                  <div className="space-y-1.5">
                    {allStatuses
                      .filter((s) => s.category !== 'Salaris' && s.category !== 'Overboekingen')
                      .sort((a, b) => a.category.localeCompare(b.category))
                      .map((s) => (
                        <label key={s.categoryId} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={spotlightCategories.includes(s.category)}
                            onChange={() => toggleCategory(s.category)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{s.category}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {spotlightStatuses.map((s) => (
              <div key={s.categoryId}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.category}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatEuro(s.spent)}{s.budget > 0 && <span className="text-xs"> / {formatEuro(s.budget)}</span>}
                  </span>
                </div>
                <ProgressBar percentage={s.budget > 0 ? s.percentage : 0} height="sm" />
              </div>
            ))}
            {spotlightStatuses.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500">Geen categorieën geselecteerd</p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Terugkerende uitgaven</h2>
            {(recurring.transactions.length > 0 || projected.length > 0 || reservations.transactions.length > 0) && (
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatEuro(Math.abs(recurring.total) + projectedTotal + reservations.totalMonthlyReservation)}
              </span>
            )}
          </div>
          <div className="overflow-y-auto max-h-72 -mr-2 pr-2">

        {hints.length === 0 && recurring.transactions.length === 0 && projected.length === 0 && reservations.transactions.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Geen terugkerende uitgaven gevonden</p>
        ) : (
          <>
            {hints.length > 0 && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mogelijk terugkerend</h3>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                    {hints.length}
                  </span>
                </div>
                <div className="divide-y divide-amber-100 dark:divide-amber-800/40">
                  {hints.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                        {t.categoryName && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{t.categoryName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatEuro(t.amount)}</span>
                        <button
                          onClick={() => handleConfirmHint(t.id)}
                          className="text-xs font-medium px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          Bevestigen
                        </button>
                        <button
                          onClick={() => handleDismissHint(t.id)}
                          className="text-xs font-medium px-2 py-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Negeren
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(recurring.transactions.length > 0 || projected.length > 0) && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recurring.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                      {t.categoryName && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t.categoryName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatEuro(t.amount)}</span>
                      <button
                        onClick={() => handleTogglePeriod(t.id, 'monthly')}
                        title="Maak jaarlijks"
                        className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      >
                        jaar
                      </button>
                      <button
                        onClick={() => handleToggleRecurring(t.id)}
                        title="Markeer als niet-terugkerend"
                        className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {projected.map((t) => (
                  <div key={`proj-${t.id}`} className="flex items-center justify-between py-2.5 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                      {t.categoryName && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t.categoryName}</p>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-400 dark:text-gray-500 shrink-0">
                      {formatEuro(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {reservations.transactions.length > 0 && (
              <div className={recurring.transactions.length > 0 ? 'mt-3' : ''}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Jaarreserveringen</p>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{formatEuro(reservations.totalMonthlyReservation)}/mnd</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reservations.transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatEuro(t.amount)}/jaar{t.categoryName ? ` · ${t.categoryName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatEuro(-t.monthlyReservation)}/mnd</span>
                        <button
                          onClick={() => handleTogglePeriod(t.id, 'yearly')}
                          title="Maak maandelijks"
                          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                          mnd
                        </button>
                        <button
                          onClick={() => handleToggleRecurring(t.id)}
                          title="Verwijder uit reserveringen"
                          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>

      {reservationsSummary && reservationsSummary.byCategory.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Reserveringen</h2>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatEuro(reservationsSummary.totalMonthly)}
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500"> / mnd</span>
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservationsSummary.byCategory.map((cat) => (
              <div key={cat.category} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{cat.category}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatEuro(cat.monthlyAmount)}
                    <span className="text-xs font-normal text-gray-400">/mnd</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  {cat.items.map((item) => (
                    <div key={item.id} className="text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="shrink-0">{formatEuro(item.monthlyAmount)}/mnd</span>
                      </div>
                      {item.progress !== null && (
                        <div className="mt-1">
                          <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.type === 'afschrijving' ? 'bg-blue-400 dark:bg-blue-500' :
                                item.type === 'terugkerend' ? 'bg-amber-400 dark:bg-amber-500' :
                                'bg-green-400 dark:bg-green-500'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
