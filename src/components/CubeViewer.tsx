import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cubing/twisty';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';

type TwistyPlayerElement = HTMLElement & {
  alg: AlgType;
  experimentalSetupAlg?: AlgType;
  tempoScale: number;
  play?: () => void;
  pause?: () => void;
};

const MOVE_GAP_MS = 1500;
const DOUBLE_BEAT_MS = 700;
const TURN_TEMPO = 0.9;

interface CubeViewerProps {
  alg: AlgType | null;
  autoplay: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function CubeViewer({ alg, autoplay }: CubeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayerElement | null>(null);
  const runIdRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentMove, setCurrentMove] = useState<string | null>(null);

  const tokens = useMemo(
    () => alg?.toString().split(' ').filter(Boolean) ?? [],
    [alg],
  );

  const quartersPlan = useMemo(
    () =>
      tokens.map((token) =>
        token.endsWith('2')
          ? { label: token, quarters: [token.slice(0, -1), token.slice(0, -1)] }
          : { label: token, quarters: [token] },
      ),
    [tokens],
  );

  useEffect(() => {
    let cancelled = false;
    let player: TwistyPlayerElement | null = null;

    customElements
      .whenDefined('twisty-player')
      .then(() => {
        if (cancelled) return;
        const host = hostRef.current;
        if (!host) return;
        player = document.createElement('twisty-player') as TwistyPlayerElement;
        player.setAttribute('background', 'none');
        player.setAttribute('control-panel', 'none');
        player.style.width = '100%';
        player.style.height = '100%';
        host.appendChild(player);
        playerRef.current = player;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
      player?.remove();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      runIdRef.current++;
    };
  }, []);

  const showStateAt = useCallback(
    (moveCount: number, quarterCount: number) => {
      const player = playerRef.current;
      if (!player) return;
      player.pause?.();
      const doneQuarters = quartersPlan
        .slice(0, moveCount)
        .flatMap((m) => m.quarters);
      const partial = quartersPlan[moveCount]?.quarters
        .slice(0, quarterCount)
        .join(' ');
      const setup = [...doneQuarters, ...(partial ? [partial] : [])].join(' ');
      player.experimentalSetupAlg = new Alg(setup);
      player.alg = new Alg('');
    },
    [quartersPlan],
  );

  const cancelPlayback = useCallback(() => {
    runIdRef.current++;
    playerRef.current?.pause?.();
    setPlaying(false);
    setCurrentMove(null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    cancelPlayback();
    showStateAt(0, 0);
    setStepIdx(0);
  }, [alg, ready, cancelPlayback, showStateAt]);

  const playRhythmic = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !alg) return;
    const myRun = ++runIdRef.current;
    const alive = () => runIdRef.current === myRun;
    const pacedSleep = async (ms: number) => {
      await sleep(ms);
      return alive();
    };

    const animateQuarter = (quarter: string, priorQuarters: string[]) => {
      if (!alive()) return;
      player.pause?.();
      player.experimentalSetupAlg = new Alg(priorQuarters.join(' '));
      player.alg = new Alg(quarter);
      player.tempoScale = TURN_TEMPO;
      player.play?.();
    };

    player.pause?.();
    showStateAt(0, 0);
    setStepIdx(0);
    setPlaying(true);

    try {
      if (!(await pacedSleep(120))) return;
      let priorQuarters: string[] = [];
      for (let i = 0; i < quartersPlan.length; i++) {
        const move = quartersPlan[i];
        setCurrentMove(move.label);
        for (let q = 0; q < move.quarters.length; q++) {
          if (!alive()) return;
          animateQuarter(move.quarters[q], priorQuarters);
          const wait =
            move.quarters.length > 1 && q === 0
              ? DOUBLE_BEAT_MS
              : MOVE_GAP_MS;
          if (!(await pacedSleep(wait))) return;
          priorQuarters = [...priorQuarters, move.quarters[q]];
        }
        setStepIdx(i + 1);
      }
      showStateAt(quartersPlan.length, 0);
      setCurrentMove(null);
    } finally {
      if (alive()) setPlaying(false);
    }
  }, [alg, quartersPlan, showStateAt]);

  const goToStep = useCallback(
    (moveCount: number) => {
      cancelPlayback();
      const clamped = Math.min(tokens.length, Math.max(0, moveCount));
      showStateAt(clamped, 0);
      setStepIdx(clamped);
    },
    [tokens.length, cancelPlayback, showStateAt],
  );

  return (
    <>
      <div ref={hostRef} className="cube-viewer">
        {!ready ? <span className="viewer-loading">Cargando visor 3D…</span> : null}
      </div>
      <div className="cube-controls">
        <button onClick={() => goToStep(0)} disabled={!alg || playing} title="Volver al inicio">
          ⏮ Inicio
        </button>
        <button onClick={() => goToStep(stepIdx - 1)} disabled={!alg || playing || stepIdx === 0}>
          ◀ Atrás
        </button>
        <span className={`step-count${currentMove ? ' live' : ''}`}>
          {currentMove
            ? `${currentMove} · ${stepIdx}/${tokens.length}`
            : `${stepIdx}/${tokens.length}`}
        </span>
        <button
          onClick={() => goToStep(stepIdx + 1)}
          disabled={!alg || playing || stepIdx >= tokens.length}
        >
          Paso ▶
        </button>
        <button
          className={playing ? 'stop' : 'play-all'}
          onClick={playing ? cancelPlayback : (() => void playRhythmic())}
          disabled={!alg}
        >
          {playing ? '⏸ Detener' : '▶ Reproducir'}
        </button>
      </div>
    </>
  );
}
