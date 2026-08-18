import type { QuickInsight } from '../types';

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getQuickInsights(year?: number, month?: number): Promise<QuickInsight[]> {
  const params = new URLSearchParams();
  if (year !== undefined) params.set('year', String(year));
  if (month !== undefined) params.set('month', String(month));
  const query = params.toString();
  return apiFetch<QuickInsight[]>(`api/insights${query ? `?${query}` : ''}`);
}
