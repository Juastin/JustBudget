import type { Reservation, ReservationSummary } from '../types';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`API fout ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function getReservations(): Promise<Reservation[]> {
  return apiFetch<Reservation[]>('api/reservations');
}

export function getReservationsSummary(): Promise<ReservationSummary> {
  return apiFetch<ReservationSummary>('api/reservations/summary');
}

export function createReservation(data: {
  name: string;
  type: string;
  amount: number;
  intervalMonths: number;
  category?: string;
  residualValue?: number | null;
  startDate?: string | null;
  savedAmount?: number;
}): Promise<Reservation> {
  return apiFetch<Reservation>('api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateReservation(
  id: number,
  data: Partial<{
    name: string;
    type: string;
    amount: number;
    intervalMonths: number;
    category: string;
    residualValue: number | null;
    startDate: string | null;
    savedAmount: number;
  }>,
): Promise<Reservation> {
  return apiFetch<Reservation>(`api/reservations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteReservation(id: number): Promise<void> {
  return apiFetch<void>(`api/reservations/${id}`, { method: 'DELETE' });
}
