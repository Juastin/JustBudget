import type { QuickInsight } from '../types';

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getQuickInsights(periodStart?: string): Promise<QuickInsight[]> {
  const query = periodStart ? `?periodStart=${periodStart}` : '';
  return apiFetch<QuickInsight[]>(`api/insights${query}`);
}
