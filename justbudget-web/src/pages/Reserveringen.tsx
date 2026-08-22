import { useEffect, useState } from 'react';
import type { Reservation, ReservationType } from '../types';
import { formatEuro } from '../types';
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} from '../services/reservationsService';

const TYPE_LABELS: Record<ReservationType, string> = {
  afschrijving: 'Afschrijving',
  terugkerend: 'Terugkerend',
  eenmalig: 'Eenmalig doel',
};

const TYPE_BADGE: Record<ReservationType, string> = {
  afschrijving: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  terugkerend: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  eenmalig: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

const TYPE_BAR: Record<ReservationType, string> = {
  afschrijving: 'bg-blue-400 dark:bg-blue-500',
  terugkerend: 'bg-amber-400 dark:bg-amber-500',
  eenmalig: 'bg-green-400 dark:bg-green-500',
};

const EMPTY_FORM = {
  type: 'afschrijving' as ReservationType,
  name: '',
  amount: '',
  residualValue: '',
  interval: '',
  intervalUnit: 'jaren' as 'maanden' | 'jaren',
  category: '',
  startDate: '',
  savedAmount: '',
};

function intervalLabel(type: ReservationType): string {
  if (type === 'afschrijving') return 'Levensduur';
  if (type === 'eenmalig') return 'Spaarduur';
  return 'Interval';
}

function amountLabel(type: ReservationType): string {
  if (type === 'afschrijving') return 'Aankoopprijs';
  if (type === 'eenmalig') return 'Doelbedrag';
  return 'Kosten per keer';
}

function dateLabel(type: ReservationType): string {
  if (type === 'afschrijving') return 'Aankoopdatum (optioneel)';
  if (type === 'terugkerend') return 'Laatste keer (optioneel)';
  return 'Startdatum (optioneel)';
}

function itemSubline(item: Reservation): string {
  if (item.type === 'afschrijving') {
    const net = item.amount - (item.residualValue ?? 0);
    const lifespan = item.intervalMonths >= 12 && item.intervalMonths % 12 === 0
      ? `${item.intervalMonths / 12} jaar`
      : `${item.intervalMonths} mnd`;
    return `${formatEuro(item.amount)}${item.residualValue ? ` − ${formatEuro(item.residualValue)} restwaarde` : ''} over ${lifespan}${net <= 0 ? ' · volledig afgeschreven' : ''}`;
  }
  if (item.type === 'terugkerend') {
    const interval = item.intervalMonths >= 12 && item.intervalMonths % 12 === 0
      ? `${item.intervalMonths / 12} jaar`
      : `${item.intervalMonths} mnd`;
    return `${formatEuro(item.amount)} per ${interval}`;
  }
  return `Doel: ${formatEuro(item.amount)} · ${formatEuro(item.savedAmount)} gespaard`;
}

export default function Reserveringen() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReservations()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const intervalMonths =
    form.interval !== ''
      ? form.intervalUnit === 'jaren'
        ? Math.round(parseFloat(form.interval) * 12)
        : Math.round(parseFloat(form.interval))
      : 0;

  const amountNum = form.amount !== '' ? parseFloat(form.amount) : 0;
  const residualNum = form.residualValue !== '' ? parseFloat(form.residualValue) : 0;
  const savedNum = form.savedAmount !== '' ? parseFloat(form.savedAmount) : 0;

  const net = form.type === 'afschrijving' ? amountNum - residualNum : amountNum - savedNum;
  const monthlyPreview = intervalMonths > 0 && net > 0 ? net / intervalMonths : null;

  const totalMonthly = items.reduce((s, r) => s + r.monthlyAmount, 0);

  const byCategory = (() => {
    const map = new Map<string, Reservation[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries())
      .map(([cat, catItems]) => ({
        category: cat,
        monthlyAmount: catItems.reduce((s, r) => s + r.monthlyAmount, 0),
        items: catItems,
      }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
  })();

  const existingCategories = Array.from(new Set(items.map((i) => i.category))).sort();

  function setType(type: ReservationType) {
    setForm((f) => ({ ...EMPTY_FORM, type, category: f.category }));
    setError(null);
  }

  function startEdit(item: Reservation) {
    const isYears = item.intervalMonths % 12 === 0;
    setForm({
      type: item.type,
      name: item.name,
      amount: String(item.amount),
      residualValue: item.residualValue != null && item.residualValue > 0 ? String(item.residualValue) : '',
      interval: isYears ? String(item.intervalMonths / 12) : String(item.intervalMonths),
      intervalUnit: isYears ? 'jaren' : 'maanden',
      category: item.category,
      startDate: item.startDate ?? '',
      savedAmount: item.savedAmount > 0 ? String(item.savedAmount) : '',
    });
    setEditingId(item.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Naam is verplicht');
    if (!amountNum || amountNum <= 0) return setError(`${amountLabel(form.type)} moet groter dan 0 zijn`);
    if (!intervalMonths || intervalMonths < 1) return setError(`${intervalLabel(form.type)} moet minimaal 1 maand zijn`);

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        amount: amountNum,
        intervalMonths,
        category: form.category.trim() || 'Overig',
        residualValue: form.type === 'afschrijving' ? (residualNum > 0 ? residualNum : null) : null,
        startDate: form.startDate || null,
        savedAmount: form.type === 'eenmalig' ? (savedNum > 0 ? savedNum : 0) : 0,
      };

      if (editingId !== null) {
        const updated = await updateReservation(editingId, payload);
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        setEditingId(null);
      } else {
        const created = await createReservation(payload);
        setItems((prev) => [...prev, created]);
      }
      setForm(EMPTY_FORM);
    } catch {
      setError('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await deleteReservation(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) cancelEdit();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reserveringen</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Afschrijvingen, terugkerende kosten en spaardoelen
          </p>
        </div>
        {totalMonthly > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm px-5 py-3 text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400">Totaal per maand</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatEuro(totalMonthly)}</p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {editingId !== null ? 'Reservering bewerken' : 'Reservering toevoegen'}
        </h2>

        {/* Type selector */}
        <div className="flex gap-2 mb-5">
          {(['afschrijving', 'terugkerend', 'eenmalig'] as ReservationType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                form.type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Naam</label>
            <input
              type="text"
              placeholder={form.type === 'afschrijving' ? 'bijv. Toyota Yaris' : form.type === 'terugkerend' ? 'bijv. Banden' : 'bijv. Vakantie'}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{amountLabel(form.type)}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder={form.type === 'afschrijving' ? '15000' : form.type === 'eenmalig' ? '2000' : '600'}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Residual value — afschrijving only */}
          {form.type === 'afschrijving' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Restwaarde (optioneel)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="bijv. 5000"
                  value={form.residualValue}
                  onChange={(e) => setForm((f) => ({ ...f, residualValue: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Already saved — eenmalig only */}
          {form.type === 'eenmalig' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Al gespaard (optioneel)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.savedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, savedAmount: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Interval */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {intervalLabel(form.type)}
              {monthlyPreview !== null && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 font-semibold">
                  → {formatEuro(monthlyPreview)}/mnd
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                step="0.5"
                placeholder={form.type === 'terugkerend' ? '2' : '10'}
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.intervalUnit}
                onChange={(e) => setForm((f) => ({ ...f, intervalUnit: e.target.value as 'maanden' | 'jaren' }))}
                className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="jaren">jaren</option>
                <option value="maanden">maanden</option>
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categorie</label>
            <input
              type="text"
              list="categories-list"
              placeholder="bijv. Voertuigen"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="categories-list">
              {existingCategories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{dateLabel(form.type)}</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? 'Opslaan…' : editingId !== null ? 'Bijwerken' : 'Toevoegen'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuleren
              </button>
            )}
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Items grouped by category */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">Nog geen reserveringen toegevoegd</p>
        </div>
      ) : (
        <div className="space-y-4">
          {byCategory.map((cat) => (
            <div key={cat.category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{cat.category}</h3>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatEuro(cat.monthlyAmount)}
                  <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/mnd</span>
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {cat.items.map((item) => (
                  <div key={item.id} className="py-3 gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm text-gray-800 dark:text-gray-200">{item.name}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[item.type]}`}>
                            {TYPE_LABELS[item.type]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{itemSubline(item)}</p>
                        {item.startDate && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {item.type === 'afschrijving' ? 'Gekocht' : item.type === 'terugkerend' ? 'Laatste keer' : 'Gestart'}{' '}
                            {new Date(item.startDate).toLocaleDateString('nl-NL', { month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {item.progress !== null && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400 dark:text-gray-500">{item.progressLabel}</span>
                              <span className="font-medium text-gray-600 dark:text-gray-400">{item.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${TYPE_BAR[item.type]}`}
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatEuro(item.monthlyAmount)}
                          <span className="text-xs font-normal text-gray-400">/mnd</span>
                        </span>
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                          title="Bewerken"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          title="Verwijderen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
