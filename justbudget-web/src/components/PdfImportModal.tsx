import { useRef, useState } from 'react';
import { formatDate, formatEuro } from '../types';
import CategoryBadge from './CategoryBadge';

type Bank = 'rabobank' | 'ing';

const BANK_STORAGE_KEY = 'preferredBank';

function getPreferredBank(): Bank {
  const stored = localStorage.getItem(BANK_STORAGE_KEY);
  return stored === 'ing' ? 'ing' : 'rabobank';
}

const BANK_CONFIG: Record<Bank, { label: string; accept: string; hint: string }> = {
  rabobank: {
    label: 'Rabobank',
    accept: '.pdf',
    hint: 'Sleep een Rabobank PDF-afschrift hierheen',
  },
  ing: {
    label: 'ING',
    accept: '.csv',
    hint: 'Sleep een ING CSV-export hierheen',
  },
};

interface PreviewTransaction {
  transactionDate: string;
  code: string;
  description: string;
  amount: number;
  hash: string;
  isNew: boolean;
  categoryId: number | null;
  category: string | null;
}

interface PreviewResult {
  count: number;
  newTransactions: number;
  existingTransactions: number;
  transactions: PreviewTransaction[];
}

interface ConfirmResult {
  parsed: number;
  imported: number;
  skipped: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'preview' | 'result';

export default function PdfImportModal({ isOpen, onClose, onImported }: Props) {
  const [bank, setBank] = useState<Bank>(getPreferredBank);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [showExisting, setShowExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const config = BANK_CONFIG[bank];

  function handleBankChange(next: Bank) {
    setBank(next);
    localStorage.setItem(BANK_STORAGE_KEY, next);
    setFile(null);
    setError(null);
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setDragging(false);
    setLoading(false);
    setError(null);
    setPreview(null);
    setResult(null);
    setShowExisting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    const ext = selected.name.toLowerCase().split('.').pop();
    const expectedExt = config.accept.replace('.', '');
    if (ext !== expectedExt) {
      setError(`Verwacht een ${config.accept.toUpperCase()}-bestand voor ${config.label}.`);
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('api/import/preview', { method: 'POST', body });
      if (!res.ok) throw new Error(`Server fout: ${res.status}`);
      const data: PreviewResult = await res.json();
      setPreview(data);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('api/import/confirm', { method: 'POST', body });
      if (!res.ok) throw new Error(`Server fout: ${res.status}`);
      const data: ConfirmResult = await res.json();
      setResult(data);
      setStep('result');
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }

  const newTx = preview?.transactions.filter((t) => t.isNew) ?? [];
  const existingTx = preview?.transactions.filter((t) => !t.isNew) ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transacties importeren</h2>
            <div className="flex items-center gap-2 mt-1">
              {(['upload', 'preview', 'result'] as Step[]).map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${step === s ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    {i + 1}. {s === 'upload' ? 'Bestand' : s === 'preview' ? 'Voorbeeld' : 'Klaar'}
                  </span>
                  {i < 2 && <span className="text-gray-300 dark:text-gray-600 text-xs">›</span>}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-4">

              {/* Bank selector */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Bank</p>
                <div className="flex gap-2">
                  {(Object.keys(BANK_CONFIG) as Bank[]).map((b) => (
                    <button
                      key={b}
                      onClick={() => handleBankChange(b)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        bank === b
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {BANK_CONFIG[b].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : file
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.accept}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-500 hover:text-red-700 mt-1"
                    >
                      Ander bestand kiezen
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{config.hint}</p>
                    <p className="text-xs text-gray-400">of klik om te bladeren</p>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && preview && (
            <div className="space-y-4">

              {/* Summary badges */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{preview.count}</span>
                  <span className="text-sm text-blue-600 dark:text-blue-400">gevonden</span>
                </div>
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">{preview.newTransactions}</span>
                  <span className="text-sm text-green-600 dark:text-green-400">nieuw</span>
                </div>
                {preview.existingTransactions > 0 && (
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{preview.existingTransactions}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">al aanwezig</span>
                  </div>
                )}
              </div>

              {preview.newTransactions === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Alle transacties zijn al eerder geïmporteerd.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Categorieën zijn automatisch herkend op basis van uw regels.
                  </p>

                  {/* New transactions table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Datum</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Omschrijving</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bedrag</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categorie</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                        {newTx.map((t) => (
                          <tr key={t.hash} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                              {formatDate(t.transactionDate)}
                            </td>
                            <td className="px-3 py-2 text-gray-900 dark:text-white max-w-[200px] truncate">
                              {t.description}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium whitespace-nowrap text-xs ${t.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatEuro(t.amount)}
                            </td>
                            <td className="px-3 py-2">
                              {t.category ? (
                                <CategoryBadge name={t.category} />
                              ) : (
                                <span className="text-xs italic text-gray-400">Niet herkend</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Existing transactions toggle */}
              {existingTx.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowExisting((v) => !v)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showExisting ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {showExisting ? 'Verberg' : 'Toon'} {existingTx.length} al aanwezige transacties
                  </button>

                  {showExisting && (
                    <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 opacity-60">
                      <table className="w-full text-xs">
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                          {existingTx.map((t) => (
                            <tr key={t.hash} className="line-through text-gray-400">
                              <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(t.transactionDate)}</td>
                              <td className="px-3 py-1.5 max-w-[200px] truncate">{t.description}</td>
                              <td className="px-3 py-1.5 text-right whitespace-nowrap">{formatEuro(t.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}

          {/* ── Step 3: Result ── */}
          {step === 'result' && result && (
            <div className="py-6 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Import geslaagd</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {result.imported} transacti{result.imported !== 1 ? 'es' : 'e'} geïmporteerd
                  {result.skipped > 0 && `, ${result.skipped} overgeslagen (al aanwezig)`}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.imported}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">geïmporteerd</p>
                </div>
                {result.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-400">{result.skipped}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">overgeslagen</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={step === 'upload' ? handleClose : step === 'preview' ? () => setStep('upload') : handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {step === 'result' ? 'Sluiten' : step === 'preview' ? 'Terug' : 'Annuleren'}
          </button>

          {step === 'upload' && (
            <button
              onClick={handlePreview}
              disabled={!file || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Verwerken...' : 'Voorbeeld bekijken'}
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleConfirm}
              disabled={loading || preview?.newTransactions === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Importeren...' : `${preview?.newTransactions ?? 0} transacties importeren`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
