import { useEffect, useRef, useState } from 'react';
import type { PeriodInfo, PeriodMode, TriggerCandidate } from '../types';
import { payPeriodLabel, formatEuro, parseISODate } from '../types';
import {
  getPeriodBoundaries,
  getPeriodSettings,
  getTriggerCandidates,
  listPeriods,
  savePeriodBoundaries,
  updatePeriodSettings,
} from '../services/periodService';

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function shortDate(dateStr: string): string {
  return parseISODate(dateStr).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface BoundaryDraft {
  id: number;
  date: string;
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
  const [savedBoundaries, setSavedBoundaries] = useState<string[]>([]);
  const [draft, setDraft] = useState<BoundaryDraft[]>([]);
  const [boundarySaving, setBoundarySaving] = useState(false);
  const [boundaryError, setBoundaryError] = useState('');
  const nextId = useRef(1);

  useEffect(() => {
    Promise.all([getPeriodSettings(), getTriggerCandidates()])
      .then(([s, c]) => {
        setCandidates(c);
        setMode(s.mode);
        setAnchorDay(s.anchorDay);
        if (s.triggerDescription) setTriggerKey(s.triggerDescription);
      })
      .finally(() => setLoading(false));

    Promise.all([listPeriods(), getPeriodBoundaries()])
      .then(([p, boundaries]) => {
        setPeriods(p);
        setSavedBoundaries(boundaries);
        setDraft(boundaries.map((date) => ({ id: nextId.current++, date })));
      })
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

  const sortedDraft = [...draft].sort((a, b) => a.date.localeCompare(b.date));
  const draftDates = sortedDraft.map((d) => d.date);
  const hasDuplicates = new Set(draftDates).size !== draftDates.length;
  const hasEmpty = draft.some((d) => !d.date);
  const isDirty = JSON.stringify(draftDates) !== JSON.stringify(savedBoundaries);
  const canSave = isDirty && !hasDuplicates && !hasEmpty && draftDates.length > 0;

  function updateBoundaryDate(id: number, value: string) {
    setDraft((prev) => prev.map((d) => (d.id === id ? { ...d, date: value } : d)));
    setBoundaryError('');
  }

  function removeBoundary(id: number) {
    setDraft((prev) => prev.filter((d) => d.id !== id));
    setBoundaryError('');
  }

  function addBoundary() {
    const last = sortedDraft[sortedDraft.length - 1]?.date;
    setDraft((prev) => [...prev, { id: nextId.current++, date: last ? addDays(last, 1) : todayStr() }]);
    setBoundaryError('');
  }

  function resetDraft() {
    setDraft(savedBoundaries.map((date) => ({ id: nextId.current++, date })));
    setBoundaryError('');
  }

  async function handleSaveBoundaries() {
    setBoundarySaving(true);
    setBoundaryError('');
    try {
      const updated = await savePeriodBoundaries(draftDates);
      setPeriods(updated);
      setSavedBoundaries(draftDates);
      setDraft(draftDates.map((date) => ({ id: nextId.current++, date })));
    } catch (e: unknown) {
      setBoundaryError(e instanceof Error ? e.message : 'Fout bij opslaan');
    } finally {
      setBoundarySaving(false);
    }
  }

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

      {/* Period boundaries editor */}
      <div className="mt-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4 max-w-2xl">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Perioden aanpassen</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Voeg een periode toe (splitsen), voeg twee perioden samen, of versleep een startdatum. Wijzigingen
            worden pas toegepast als je op Opslaan klikt.
          </p>
        </div>

        {periodsLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ) : (
          <>
            <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Start</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-gray-400">Einde</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {sortedDraft.map((b, i) => {
                    const end = i + 1 < sortedDraft.length ? addDays(sortedDraft[i + 1].date, -1) : null;
                    return (
                      <tr key={b.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={b.date}
                            onChange={(e) => updateBoundaryDate(b.id, e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                          {end ? shortDate(end) : 'heden'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => removeBoundary(b.id)}
                            disabled={i === 0 || sortedDraft.length <= 1}
                            title={i === 0 ? 'Eerste periode kan niet samengevoegd worden' : 'Samenvoegen met vorige periode'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M4.25 12a.75.75 0 01.75-.75h14a.75.75 0 010 1.5H5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasDuplicates && (
              <p className="text-sm text-red-600 dark:text-red-400">Elke startdatum mag maar één keer voorkomen.</p>
            )}
            {boundaryError && <p className="text-sm text-red-600 dark:text-red-400">{boundaryError}</p>}

            <div className="flex items-center gap-3">
              <button
                onClick={addBoundary}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              >
                + Periode toevoegen
              </button>
              <button
                onClick={handleSaveBoundaries}
                disabled={!canSave || boundarySaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {boundarySaving ? 'Opslaan...' : 'Opslaan'}
              </button>
              {isDirty && (
                <button
                  onClick={resetDraft}
                  disabled={boundarySaving}
                  className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Wijzigingen ongedaan maken
                </button>
              )}
            </div>
          </>
        )}

        {!periodsLoading && periods.length > 0 && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Opgeslagen perioden met transacties</p>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {periods.map((p) => (
                <li key={p.start} className="flex justify-between">
                  <span>{payPeriodLabel(p.start, p.end)}</span>
                  <span className="text-gray-400">{p.transactionCount} transacties</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
