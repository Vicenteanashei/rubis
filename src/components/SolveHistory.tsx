import { formatMs } from '../lib/format';
import type { SolveRecord } from '../types';

interface SolveHistoryProps {
  solves: SolveRecord[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function SolveHistory({ solves, onDelete, onClear }: SolveHistoryProps) {
  const ordered = [...solves].reverse();
  return (
    <section className="panel history-panel">
      <div className="history-header">
        <h2>Historial</h2>
        {solves.length > 0 ? (
          <button className="link-btn" onClick={onClear}>
            limpiar
          </button>
        ) : null}
      </div>
      {ordered.length === 0 ? (
        <p className="hint empty">Aún no hay solves. ¡Corre el primero!</p>
      ) : (
        <ol className="history-list">
          {ordered.map((record, index) => {
            const number = solves.length - index;
            const cls =
              record.penalty === 'DNF' ? 'dnf' : record.penalty === '+2' ? 'plus2' : '';
            return (
              <li key={record.id} title={record.scramble}>
                <span className="num">#{number}</span>
                <span className={`time ${cls}`}>
                  {record.penalty === 'DNF'
                    ? 'DNF'
                    : `${formatMs(record.rawMs)}${record.penalty === '+2' ? '+2' : ''}`}
                </span>
                <button
                  className="x-btn"
                  onClick={() => onDelete(record.id)}
                  aria-label={`Eliminar solve #${number}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
