export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalS = Math.floor(totalCs / 100);
  const s = totalS % 60;
  const m = Math.floor(totalS / 60);
  const ss = String(cs).padStart(2, '0');
  if (m > 0) {
    return `${m}:${String(s).padStart(2, '0')}.${ss}`;
  }
  return `${s}.${ss}`;
}
