import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';
import { randomScrambleForEvent } from 'cubing/scramble';
import { CubeViewer } from './components/CubeViewer';
import { ScramblePanel } from './components/ScramblePanel';
import { TimerView } from './components/TimerView';
import { StatsPanel } from './components/StatsPanel';
import { SolveHistory } from './components/SolveHistory';
import { useSolver } from './hooks/useSolver';
import { useTimer } from './hooks/useTimer';
import type { NewRecord } from './hooks/useTimer';
import { computeStats } from './lib/stats';
import { loadSettings, loadSolves, saveSettings, saveSolves } from './lib/storage';
import type { Settings, SolveRecord } from './types';

export default function App() {
  const [scramble, setScramble] = useState<AlgType | null>(null);
  const [generating, setGenerating] = useState(true);
  const [solution, setSolution] = useState<string | null>(null);
  const [solving, setSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [view, setView] = useState<{
    alg: AlgType;
    kind: 'scramble' | 'solución';
    fromSolve: boolean;
  } | null>(null);
  const [solves, setSolves] = useState<SolveRecord[]>(loadSolves);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const scrambleIdRef = useRef(0);
  const { solve } = useSolver();

  const newScramble = useCallback(async (fromSolve: boolean) => {
    const id = ++scrambleIdRef.current;
    setGenerating(true);
    setSolution(null);
    setSolveError(null);
    try {
      const alg = await randomScrambleForEvent('333');
      if (id !== scrambleIdRef.current) return;
      setScramble(alg);
      setView({ alg, kind: 'scramble', fromSolve });
    } catch {
      if (id === scrambleIdRef.current) {
        setSolveError(
          'No se pudo generar el scramble. Revisa tu conexión e inténtalo de nuevo.',
        );
      }
    } finally {
      if (id === scrambleIdRef.current) setGenerating(false);
    }
  }, []);

  useEffect(() => {
    void newScramble(false);
  }, [newScramble]);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => saveSolves(solves), [solves]);

  const requestSolution = useCallback(async () => {
    const current = scramble;
    if (!current || solving) return;
    setSolving(true);
    setSolveError(null);
    try {
      const result = await solve(current.toString());
      setSolution(result);
      setView({ alg: new Alg(result), kind: 'solución', fromSolve: false });
    } catch (err) {
      setSolveError(`Error del solver: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSolving(false);
    }
  }, [scramble, solving, solve]);

  const handleComplete = useCallback(
    (record: NewRecord) => {
      setSolves((prev) => [
        ...prev,
        {
          ...record,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          date: Date.now(),
        },
      ]);
      void newScramble(true);
    },
    [newScramble],
  );

  const timer = useTimer({
    inspectionEnabled: settings.inspectionEnabled,
    onComplete: handleComplete,
    getScramble: () => (scramble ? scramble.toString() : null),
  });

  const stats = useMemo(() => computeStats(solves), [solves]);

  const deleteSolve = useCallback((id: string) => {
    setSolves((prev) => prev.filter((record) => record.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm('¿Eliminar todo el historial de solves?')) {
      setSolves([]);
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧩 Rubik Timer</h1>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.inspectionEnabled}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, inspectionEnabled: e.target.checked }))
            }
          />
          <span>Inspección WCA 15s</span>
        </label>
      </header>

      <main className="main">
        <div className="viewer-wrap panel">
          <CubeViewer
            alg={view?.alg ?? null}
            autoplay={view?.kind === 'solución'}
            setup={view?.kind === 'solución' ? (scramble?.toString() ?? null) : null}
          />
          <div className="viewer-bar">
            <span className="view-label">
              {view?.kind === 'solución'
                ? 'Solución — síguela paso a paso con los controles'
                : view
                  ? view.fromSolve
                    ? '✓ Solve guardado — nuevo scramble cargado en el 3D · BLANCO arriba, VERDE al frente'
                    : 'Cubo resuelto · sostén el tuyo con BLANCO arriba y VERDE al frente · parte siempre del cubo resuelto'
                  : 'Cargando cubo…'}
            </span>
          </div>
        </div>

        <ScramblePanel
          scramble={scramble?.toString() ?? null}
          generating={generating}
          solution={solution}
          solving={solving}
          solveError={solveError}
          onNewScramble={() => void newScramble(false)}
          onSolve={() => void requestSolution()}
        />

        <TimerView
          phase={timer.phase}
          display={timer.display}
          holding={timer.holding}
          lastPenalty={timer.lastPenalty}
          onPointerDown={timer.pointerDown}
          onPointerUp={timer.pointerUp}
        />

        <p className="keys-hint">
          Espacio: iniciar / detener · Esc: cancelar inspección · Arrastra el cubo para girarlo
        </p>
      </main>

      <aside className="side">
        <StatsPanel stats={stats} />
        <SolveHistory solves={solves} onDelete={deleteSolve} onClear={clearHistory} />
      </aside>
    </div>
  );
}
