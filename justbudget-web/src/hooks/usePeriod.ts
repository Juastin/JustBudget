import { useCallback, useEffect, useState } from 'react';
import type { PeriodRange } from '../types';
import { getAdjacentPeriod, getCurrentPeriod } from '../services/periodService';

export function usePeriod() {
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [currentStart, setCurrentStart] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPeriod().then((r) => {
      setRange(r);
      setCurrentStart(r.start);
    });
  }, []);

  const goPrev = useCallback(() => {
    if (range) getAdjacentPeriod(range.start, 'prev').then(setRange);
  }, [range]);

  const goNext = useCallback(() => {
    if (range) getAdjacentPeriod(range.start, 'next').then(setRange);
  }, [range]);

  const goCurrent = useCallback(() => {
    getCurrentPeriod().then((r) => {
      setRange(r);
      setCurrentStart(r.start);
    });
  }, []);

  return {
    range,
    isCurrent: range !== null && range.start === currentStart,
    goPrev,
    goNext,
    goCurrent,
  };
}
