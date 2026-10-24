import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { YearlyTrendPoint } from '../types';
import { formatEuro } from '../types';
import { getYearlyTrend } from '../services/insightsService';
import { usePeriodContext } from '../context/PeriodContext';

type ChartType = 'spendable' | 'category' | 'total';

const LINE_COLOR = '#2a78d6';
const LINE_COLOR_DARK = '#3987e5';
const BUDGET_LINE_COLOR = '#898781';
const GRID_COLOR = '#e1e0d9';
const GRID_COLOR_DARK = '#2c2c2a';
const AXIS_COLOR = '#52514e';
const AXIS_COLOR_DARK = '#c3c2b7';

function useIsDark() {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export default function Inzichten() {
  const { range } = usePeriodContext();
  const [year, setYear] = useState(() => (range ? Number(range.start.slice(0, 4)) : new Date().getFullYear()));
  const [data, setData] = useState<YearlyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('spendable');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const isDark = useIsDark();

  useEffect(() => {
    setLoading(true);
    getYearlyTrend(year)
      .then(setData)
      .finally(() => setLoading(false));
  }, [year]);

  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const point of data) {
      for (const c of point.categories) {
        if (c.category === 'Salaris' || c.category === 'Overboekingen' || c.budget <= 0) continue;
        map.set(c.categoryId, c.category);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  useEffect(() => {
    if (chartType === 'category' && categoryId === null && categoryOptions.length > 0) {
      setCategoryId(categoryOptions[0].id);
    }
  }, [chartType, categoryId, categoryOptions]);

  const chartData = useMemo(() => {
    return data.map((point) => {
      const cat = point.categories.find((c) => c.categoryId === categoryId);
      return {
        month: point.monthLabel,
        spendable: point.spendable,
        totalSpent: point.totalSpent,
        categorySpent: cat?.spent ?? 0,
        categoryBudget: cat?.budget ?? 0,
      };
    });
  }, [data, categoryId]);

  const selectedCategoryName = categoryOptions.find((c) => c.id === categoryId)?.name ?? '';
  const lineColor = isDark ? LINE_COLOR_DARK : LINE_COLOR;
  const gridColor = isDark ? GRID_COLOR_DARK : GRID_COLOR;
  const axisColor = isDark ? AXIS_COLOR_DARK : AXIS_COLOR;

  function goYear(delta: number) {
    setYear((y) => y + delta);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inzichten</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verloop per maand over {year}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => goYear(-1)}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Vorig jaar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[48px] text-center select-none">{year}</span>
          <button
            onClick={() => goYear(1)}
            disabled={year >= new Date().getFullYear()}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Volgend jaar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="spendable">Nog te besteden tot nu</option>
            <option value="category">Budget per categorie</option>
            <option value="total">Totaal uitgegeven</option>
          </select>

          {chartType === 'category' && (
            <select
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value === '' ? null : Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        {loading ? (
          <div className="h-80 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-20 text-center">Geen data voor {year}</p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="month" stroke={axisColor} tick={{ fill: axisColor, fontSize: 12 }} axisLine={{ stroke: gridColor }} tickLine={false} />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatEuro(v)}
                width={90}
              />
              <Tooltip
                formatter={(value) => formatEuro(Number(value))}
                contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#ffffff', border: 'none', borderRadius: 8, fontSize: 13 }}
                labelStyle={{ color: isDark ? '#ffffff' : '#0b0b0b' }}
              />
              {chartType === 'spendable' && (
                <Line
                  type="monotone"
                  dataKey="spendable"
                  name="Nog te besteden tot nu"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {chartType === 'total' && (
                <Line
                  type="monotone"
                  dataKey="totalSpent"
                  name="Totaal uitgegeven"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              )}
              {chartType === 'category' && (
                <>
                  <Legend wrapperStyle={{ fontSize: 13, color: axisColor }} />
                  <Line
                    type="monotone"
                    dataKey="categorySpent"
                    name={selectedCategoryName || 'Besteed'}
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="categoryBudget"
                    name="Budget"
                    stroke={BUDGET_LINE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
