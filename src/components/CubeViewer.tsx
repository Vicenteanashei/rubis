import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cubing/twisty';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';

type TwistyPlayerElement = HTMLElement & {
  alg: AlgType;
  tempoScale: number;
  play?: () => void;
  pause?: () => void;
  experimentalAddMove?: (move: string) => void;
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

  const cancelPlayback = useCallback(() => {
    runIdRef.current++;
    playerRef.current?.pause?.();
    setPlaying(false);
    setCurrentMove(null);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;
    cancelPlayback();
    player.alg = new Alg(alg ? alg.toString() : '');
    setStepIdx(0);
  }, [alg, ready, cancelPlayback]);

  const playRhythmic = useCallback(async () => {
    const player = playerRef.current;
    if (!player || !alg) return;
    const myRun = ++runIdRef.current;
    const alive = () => runIdRef.current === myRun;
    const pacedSleep = async (ms: number) => {
      await sleep(ms);
      return alive();
    };

    player.pause?.();
    player.alg = new Alg('');
    player.tempoScale = TURN_TEMPO;
    setStepIdx(0);
    setPlaying(true);

    try {
      if (!(await pacedSleep(120))) return;
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        setCurrentMove(token);
        const isDouble = token.endsWith('2');
        const base = isDouble ? token.slice(0, -1) : token;
        const quarters = isDouble ? [base, base] : [token];
        for (let q = 0; q < quarters.length; q++) {
          if (!alive()) return;
          player.experimentalAddMove?.(quarters[q]);
          player.play?.();
          const wait = isDouble && q === 0 ? DOUBLE_BEAT_MS : MOVE_GAP_MS;
          if (!(await pacedSleep(wait))) return;
        }
        setStepIdx(i + 1);
      }
      setCurrentMove(null);
    } finally {
      if (alive()) setPlaying(false);
    }
  }, [alg, tokens]);

  const goToStep = useCallback(
    (idx: number) => {
      cancelPlayback();
      const clamped = Math.min(tokens.length, Math.max(0, idx));
      const player = playerRef.current;
      if (!player) return;
      player.alg = new Alg(tokens.slice(0, clamped).join(' '));
      setStepIdx(clamped);
    },
    [tokens, cancelPlayback],
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
          {currentMove ? `${currentMove} · ${stepIdx}/${tokens.length}` : `${stepIdx}/${tokens.length}`}
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
