import { createContext, useContext, type ReactNode } from 'react';
import { usePeriod } from '../hooks/usePeriod';

type PeriodContextValue = ReturnType<typeof usePeriod>;

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const period = usePeriod();
  return <PeriodContext.Provider value={period}>{children}</PeriodContext.Provider>;
}

export function usePeriodContext() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriodContext must be used within a PeriodProvider');
  return ctx;
}
