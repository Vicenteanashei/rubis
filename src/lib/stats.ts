import type { SolveRecord } from '../types';

export type Avg = number | 'DNF' | null;

export function adjustedTime(record: SolveRecord): number | 'DNF' {
  if (record.penalty === 'DNF' || record.rawMs == null) return 'DNF';
  return record.rawMs + (record.penalty === '+2' ? 2000 : 0);
}

function trimmedMean(window: (number | 'DNF')[]): number | 'DNF' {
  if (window.some((t) => t === 'DNF')) return 'DNF';
  const sorted = [...(window as number[])].sort((a, b) => a - b);
  const inner = sorted.slice(1, sorted.length - 1);
  return Math.round(inner.reduce((sum, t) => sum + t, 0) / inner.length);
}

function rollingAverages(times: (number | 'DNF')[], size: number): (number | 'DNF')[] {
  const out: (number | 'DNF')[] = [];
  for (let end = size; end <= times.length; end++) {
    out.push(trimmedMean(times.slice(end - size, end)));
  }
  return out;
}

function bestOf(averages: (number | 'DNF')[]): Avg {
  if (averages.length === 0) return null;
  const numeric = averages.filter((v): v is number => typeof v === 'number');
  if (numeric.length === 0) return 'DNF';
  return Math.min(...numeric);
}

export interface SessionStats {
  count: number;
  bestSingle: number | null;
  currentAo5: Avg;
  currentAo12: Avg;
  bestAo5: Avg;
  bestAo12: Avg;
}

export function computeStats(solves: SolveRecord[]): SessionStats {
  const times = solves.map(adjustedTime);
  const singles = times.filter((t): t is number => t !== 'DNF');
  const ao5s = rollingAverages(times, 5);
  const ao12s = rollingAverages(times, 12);

  return {
    count: solves.length,
    bestSingle: singles.length > 0 ? Math.min(...singles) : null,
    currentAo5: ao5s.length > 0 ? ao5s[ao5s.length - 1] : null,
    currentAo12: ao12s.length > 0 ? ao12s[ao12s.length - 1] : null,
    bestAo5: bestOf(ao5s),
    bestAo12: bestOf(ao12s),
  };
}
