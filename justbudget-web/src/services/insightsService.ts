import type { YearlyTrendPoint } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getYearlyTrend(year: number): Promise<YearlyTrendPoint[]> {
  return apiFetch<YearlyTrendPoint[]>(`api/insights/yearly-trend?year=${year}`);
}
