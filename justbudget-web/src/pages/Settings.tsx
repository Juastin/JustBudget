import { useEffect, useState } from 'react';
import type { PeriodInfo, PeriodMode, TriggerCandidate } from '../types';
import { formatEuro, parseISODate, payPeriodLabel } from '../types';
import {
  getPeriodSettings,
  getTriggerCandidates,
  listPeriods,
  removePeriodAdjustment,
  setPeriodAdjustment,
  updatePeriodSettings,
} from '../services/periodService';

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function shortDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Settings() {
  const [candidates, setCandidates] = useState<TriggerCandidate[]>([]);
  const [mode, setMode] = useState<PeriodMode>('FIXED_DAY');
  const [anchorDay, setAnchorDay] = useState(20);
  const [triggerKey, setTriggerKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [editingPeriod, setEditingPeriod] = useState<PeriodInfo | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    Promise.all([getPeriodSettings(), getTriggerCandidates()])
      .then(([s, c]) => {
        setCandidates(c);
        setMode(s.mode);
        setAnchorDay(s.anchorDay);
        if (s.triggerDescription) setTriggerKey(s.triggerDescription);
      })
      .finally(() => setLoading(false));

    listPeriods()
      .then(setPeriods)
      .finally(() => setPeriodsLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updatePeriodSettings({
        mode,
        anchorDay,
        triggerDescription: mode === 'TRANSACTION' && triggerKey ? triggerKey : undefined,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(period: PeriodInfo) {
    setEditingPeriod(period);
    setEditStart(period.start);
    setEditEnd(period.end ?? '');
    setEditError('');
  }

  function closeEditModal() {
    setEditingPeriod(null);
    setEditError('');
  }

  async function handleSaveAdjustment() {
    if (!editingPeriod) return;
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await setPeriodAdjustment(
        editingPeriod.originalStart,
        editStart,
        editEnd || null,
      );
      setPeriods(updated);
      closeEditModal();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Fout bij opslaan');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRemoveAdjustment() {
    if (!editingPeriod) return;
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await removePeriodAdjustment(editingPeriod.originalStart);
      setPeriods(updated);
      closeEditModal();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Fout bij verwijderen');
    } finally {
      setEditSaving(false);
    }
  }

  // Constraints for the editing modal.
  // Start can reach into the previous period (but not before its start).
  // End can reach into the next period (but not past its end).
  // Adjacent periods are auto-adjusted to fill the boundary.
  const editIdx = editingPeriod
    ? periods.findIndex((p) => p.originalStart === editingPeriod.originalStart)
    : -1;
  const olderPeriod = editIdx >= 0 && editIdx + 1 < periods.length ? periods[editIdx + 1] : null;
  const newerPeriod = editIdx > 0 ? periods[editIdx - 1] : null;
  const minStartDate = olderPeriod ? addDays(olderPeriod.start, 1) : undefined;
  const maxEndDate = newerPeriod?.end ? addDays(newerPeriod.end, -1) : undefined;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instellingen</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ook hier heb jij de regie.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Periode-instellingen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
            Bepaal wanneer een budgetperiode opnieuw begint
          </p>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'FIXED_DAY'}
                onChange={() => setMode('FIXED_DAY')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">Vaste dag</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  De periode loopt van een vaste dag in de maand tot de dag ervoor in de volgende maand.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="mode"
                checked={mode === 'TRANSACTION'}
                onChange={() => setMode('TRANSACTION')}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">Reset op transactie</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  De periode loopt van de ene terugkerende transactie (bijv. salaris) tot de volgende, ongeacht de exacte datum.
                  Zolang er nog geen transactie gevonden is, wordt de vaste dag hieronder gebruikt als terugval.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
            Vaste dag van de maand{mode === 'TRANSACTION' ? ' (terugval)' : ''}
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={anchorDay}
            onChange={(e) => setAnchorDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
            className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {mode === 'TRANSACTION' && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
              Transactie die de periode reset
            </label>
            {candidates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Geen terugkerende transacties gevonden.</p>
            ) : (
              <select
                value={triggerKey}
                onChange={(e) => setTriggerKey(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Selecteer transactie...</option>
                {candidates.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.description} — {formatEuro(c.lastAmount)} ({c.count}×, laatst {c.lastDate})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || (mode === 'TRANSACTION' && !triggerKey)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>}
        </div>
      </div>

      {/* Period adjustments */}
      <div className="mt-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Perioden aanpassen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Pas handmatig de datumgrenzen van een specifieke periode aan.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden max-w-2xl">
          {periodsLoading ? (
            <div className="p-6 space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
              ))}
            </div>
          ) : periods.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Geen perioden gevonden.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Periode</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Transacties</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr
                    key={p.originalStart}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      <span>{payPeriodLabel(p.start, p.end)}</span>
                      {p.hasAdjustment && (
                        <span className="ml-2 inline-block text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          aangepast
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {p.transactionCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Periode aanpassen"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Periode aanpassen
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Oorspronkelijk: {payPeriodLabel(editingPeriod.originalStart, editingPeriod.end)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={editStart}
                  min={minStartDate}
                  onChange={(e) => setEditStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {olderPeriod && editStart && editStart !== editingPeriod?.start && (
                  <p className="text-xs text-blue-500 mt-1">
                    Vorige periode eindigt automatisch op {shortDate(addDays(editStart, -1))}
                  </p>
                )}
                {minStartDate && (
                  <p className="text-xs text-gray-400 mt-1">Min. {shortDate(minStartDate)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Einddatum
                </label>
                <input
                  type="date"
                  value={editEnd}
                  min={editStart || undefined}
                  max={maxEndDate}
                  onChange={(e) => setEditEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {newerPeriod && editEnd && editEnd !== (editingPeriod?.end ?? '') && (
                  <p className="text-xs text-blue-500 mt-1">
                    Volgende periode begint automatisch op {shortDate(addDays(editEnd, 1))}
                  </p>
                )}
                {maxEndDate && (
                  <p className="text-xs text-gray-400 mt-1">Max. {shortDate(maxEndDate)}</p>
                )}
              </div>

              {editError && (
                <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleSaveAdjustment}
                disabled={editSaving || !editStart}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {editSaving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={closeEditModal}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annuleren
              </button>
              {editingPeriod.hasAdjustment && (
                <button
                  onClick={handleRemoveAdjustment}
                  disabled={editSaving}
                  className="ml-auto px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Aanpassing verwijderen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
