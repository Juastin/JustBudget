import { currentPayPeriod, payPeriodLabel } from '../types';

interface Props {
  year: number;
  month: number; // 1-indexed start month of pay period
  onChange: (year: number, month: number) => void;
}

function prevPeriod(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextPeriod(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export default function PeriodSelector({ year, month, onChange }: Props) {
  const current = currentPayPeriod();
  const isCurrentPeriod = year === current.year && month === current.month;

  const prev = prevPeriod(year, month);
  const next = nextPeriod(year, month);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(prev.year, prev.month)}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
        title="Vorige periode"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[160px] text-center select-none">
        {payPeriodLabel(year, month)}
      </span>

      <button
        onClick={() => !isCurrentPeriod && onChange(next.year, next.month)}
        disabled={isCurrentPeriod}
        className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Volgende periode"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {!isCurrentPeriod && (
        <button
          onClick={() => onChange(current.year, current.month)}
          className="ml-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
        >
          Huidig
        </button>
      )}
    </div>
  );
}
