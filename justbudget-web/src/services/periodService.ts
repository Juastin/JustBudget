import type { PeriodInfo, PeriodRange, PeriodSettings, TriggerCandidate } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getCurrentPeriod(): Promise<PeriodRange> {
  return apiFetch<PeriodRange>('api/periods/current');
}

export function getAdjacentPeriod(start: string, direction: 'prev' | 'next'): Promise<PeriodRange> {
  return apiFetch<PeriodRange>(`api/periods/adjacent?start=${start}&direction=${direction}`);
}

export function getPeriodSettings(): Promise<PeriodSettings> {
  return apiFetch<PeriodSettings>('api/period-settings');
}

export function getTriggerCandidates(): Promise<TriggerCandidate[]> {
  return apiFetch<TriggerCandidate[]>('api/periods/trigger-candidates');
}

export function updatePeriodSettings(data: {
  mode: PeriodSettings['mode'];
  anchorDay: number;
  triggerDescription?: string;
}): Promise<PeriodSettings> {
  return apiFetch<PeriodSettings>('api/period-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function listPeriods(): Promise<PeriodInfo[]> {
  return apiFetch<PeriodInfo[]>('api/periods/all');
}

export function getPeriodBoundaries(): Promise<string[]> {
  return apiFetch<string[]>('api/periods/boundaries');
}

export function savePeriodBoundaries(dates: string[]): Promise<PeriodInfo[]> {
  return apiFetch<PeriodInfo[]>('api/periods/boundaries', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dates }),
  });
}
