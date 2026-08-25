import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cubing/twisty';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';

type TwistyPlayerElement = HTMLElement & {
  alg: AlgType | string;
  experimentalSetupAlg?: AlgType | string;
  tempoScale?: number;
  timestamp?: number | string;
  play?: () => void;
  pause?: () => void;
  jumpToStart?: () => void;
  experimentalGet?: { timestamp?: () => Promise<number> };
};

const QUARTER_MS = 1000;
const DOUBLE_MS = 1500;
const POLL_MS = 180;

interface CubeViewerProps {
  alg: AlgType | null;
  autoplay: boolean;
  setup?: string | null;
}

export function CubeViewer({ alg, autoplay, setup }: CubeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayerElement | null>(null);
  const autoKeyRef = useRef<string>('');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const tokens = useMemo(
    () => alg?.toString().split(' ').filter(Boolean) ?? [],
    [alg],
  );

  const boundaries = useMemo(() => {
    const arr: number[] = [0];
    let t = 0;
    for (const tok of tokens) {
      t += tok.endsWith('2') ? DOUBLE_MS : QUARTER_MS;
      arr.push(t);
    }
    return arr;
  }, [tokens]);

  const total = tokens.length;

  const seekToMove = useCallback(
    (moveCount: number) => {
      const player = playerRef.current;
      if (!player) return;
      player.pause?.();
      const clamped = Math.min(total, Math.max(0, moveCount));
      player.timestamp = boundaries[clamped] ?? 0;
      return clamped;
    },
    [boundaries, total],
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
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;
    player.pause?.();
    setPlaying(false);
    setStepIdx(0);
    autoKeyRef.current = '';
    player.experimentalSetupAlg = new Alg(setup ?? '');
    if (alg) player.alg = new Alg(alg.toString());
    player.tempoScale = 1;
    player.timestamp = 0;
  }, [alg, setup, ready]);

  useEffect(() => {
    if (!ready || !alg || !autoplay || total === 0) return;
    const key = `${setup ?? ''}::${alg.toString()}`;
    if (autoKeyRef.current === key) return;
    autoKeyRef.current = key;
    const id = window.setTimeout(() => {
      playerRef.current?.play?.();
      setPlaying(true);
    }, 350);
    return () => window.clearTimeout(id);
  }, [alg, autoplay, ready, total, setup]);

  useEffect(() => {
    if (!playing || !ready || total === 0) return;
    const id = window.setInterval(async () => {
      const player = playerRef.current;
      const getter = player?.experimentalGet?.timestamp;
      if (!getter) return;
      try {
        const ts = await getter.call(player);
        const n = Number(ts);
        if (!Number.isFinite(n)) return;
        const doneCount = boundaries.findIndex((b) => b > n);
        const done = doneCount === -1 ? total : doneCount;
        if (done >= total) {
          setPlaying(false);
          setStepIdx(total);
          playerRef.current?.pause?.();
          return;
        }
        setStepIdx(done);
      } catch {
        /* noop */
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [playing, ready, total, boundaries]);

  const handlePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || total === 0) return;
    if (!playing && stepIdx >= total) {
      player.timestamp = 0;
      setStepIdx(0);
    }
    player.play?.();
    setPlaying(true);
  }, [playing, stepIdx, total]);

  const handleStop = useCallback(() => {
    const player = playerRef.current;
    player?.pause?.();
    setPlaying(false);
  }, []);

  const goToStep = useCallback(
    (moveCount: number) => {
      const clamped = seekToMove(moveCount);
      if (clamped !== undefined) setStepIdx(clamped);
    },
    [seekToMove],
  );

  const liveLabel =
    playing && stepIdx < total
      ? `${tokens[Math.min(stepIdx, total - 1)]} · ${stepIdx + 1}/${total}`
      : `${stepIdx}/${total}`;

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
        <span className={`step-count${playing ? ' live' : ''}`}>{liveLabel}</span>
        <button
          onClick={() => goToStep(stepIdx + 1)}
          disabled={!alg || playing || stepIdx >= total}
        >
          Paso ▶
        </button>
        <button
          className={playing ? 'stop' : 'play-all'}
          onClick={playing ? handleStop : handlePlay}
          disabled={!alg}
        >
          {playing ? '⏸ Detener' : '▶ Reproducir'}
        </button>
      </div>
    </>
  );
}
