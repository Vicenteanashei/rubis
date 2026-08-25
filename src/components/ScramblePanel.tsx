interface ScramblePanelProps {
  scramble: string | null;
  generating: boolean;
  solution: string | null;
  solving: boolean;
  solveError: string | null;
  onNewScramble: () => void;
  onSolve: () => void;
}

export function ScramblePanel({
  scramble,
  generating,
  solution,
  solving,
  solveError,
  onNewScramble,
  onSolve,
}: ScramblePanelProps) {
  const moves = scramble?.split(' ').filter(Boolean) ?? [];
  return (
    <section className="panel scramble-panel">
      <div className="scramble-header">
        <h2>Scramble</h2>
        <span className="hint">{generating ? 'generando…' : 'random-state WCA'}</span>
      </div>
      <p className="scramble-moves" aria-label="scramble">
        {moves.map((move, i) => (
          <span key={`${move}-${i}`}>{move}</span>
        ))}
      </p>
      <div className="btn-row">
        <button className="btn ghost" onClick={onNewScramble} disabled={generating}>
          Nuevo scramble
        </button>
        <button
          className="btn primary"
          onClick={onSolve}
          disabled={!scramble || solving || generating}
        >
          {solving ? 'Calculando…' : solution ? 'Resolver otra vez' : 'Resolver automáticamente'}
        </button>
      </div>
      {solveError ? <p className="error">{solveError}</p> : null}
      {solution ? (
        <p className="solution">
          <strong>Solución ({moves.length ? `${solution.split(' ').length} movimientos` : ''}):</strong>{' '}
          {solution}
        </p>
      ) : null}
    </section>
  );
}
