import type { Category, CategoryRule } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('api/categories');
}

export function createCategory(name: string, color?: string, budgetAmount?: number): Promise<Category> {
  return apiFetch<Category>('api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color, budgetAmount }),
  });
}

export function deleteCategory(id: number): Promise<void> {
  return apiFetch<void>(`api/categories/${id}`, { method: 'DELETE' });
}

export function updateCategory(id: number, data: Partial<Category>): Promise<Category> {
  return apiFetch<Category>(`api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function getRules(): Promise<CategoryRule[]> {
  return apiFetch<CategoryRule[]>('api/category-rules');
}

export function createRule(keyword: string, categoryId: number, _categoryName: string): Promise<CategoryRule> {
  return apiFetch<CategoryRule>('api/category-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, categoryId }),
  });
}

export function deleteRule(id: number): Promise<void> {
  return apiFetch<void>(`api/category-rules/${id}`, { method: 'DELETE' });
}

export function applyRuleToAll(id: number): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`api/category-rules/${id}/apply`, { method: 'POST' });
}
