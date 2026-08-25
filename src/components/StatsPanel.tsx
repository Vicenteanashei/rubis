import type { SessionStats } from '../lib/stats';
import { formatMs } from '../lib/format';

function formatAvg(avg: number | 'DNF' | null): string {
  if (avg === 'DNF') return 'DNF';
  if (avg == null) return '—';
  return formatMs(avg);
}

export function StatsPanel({ stats }: { stats: SessionStats }) {
  const rows: Array<[string, string]> = [
    ['Resueltos', String(stats.count)],
    ['Mejor single', stats.bestSingle == null ? '—' : formatMs(stats.bestSingle)],
    ['Ao5 actual', formatAvg(stats.currentAo5)],
    ['Ao12 actual', formatAvg(stats.currentAo12)],
    ['Mejor Ao5', formatAvg(stats.bestAo5)],
    ['Mejor Ao12', formatAvg(stats.bestAo12)],
  ];
  return (
    <section className="panel stats-panel">
      <h2>Estadísticas</h2>
      <dl className="stats-grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
