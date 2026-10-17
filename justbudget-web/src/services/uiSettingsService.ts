import type { QuickInsightOptions } from '../types';

export interface UiSettings {
  spotlightCategories: string[];
  insightOptions: QuickInsightOptions;
}

export type UpdateUiSettingsPayload = Partial<UiSettings>;

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getUiSettings(): Promise<UiSettings> {
  return apiFetch<UiSettings>('api/ui-settings');
}

export function updateUiSettings(payload: UpdateUiSettingsPayload): Promise<UiSettings> {
  return apiFetch<UiSettings>('api/ui-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
