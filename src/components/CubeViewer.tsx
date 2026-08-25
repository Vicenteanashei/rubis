import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'cubing/twisty';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';

type TwistyPlayerElement = HTMLElement & {
  alg: AlgType;
  tempoScale: number;
  play?: () => void;
  pause?: () => void;
};

interface CubeViewerProps {
  alg: AlgType | null;
  autoplay: boolean;
}

export function CubeViewer({ alg, autoplay }: CubeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayerElement | null>(null);
  const [ready, setReady] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

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
    if (!ready) return;
    const player = playerRef.current;
    if (!player) return;
    player.pause?.();
    player.alg = new Alg(alg ? alg.toString() : '');
    setStepIdx(0);
    if (alg && autoplay) {
      player.tempoScale = 1.15;
      player.play?.();
    }
  }, [alg, autoplay, ready]);

  const goToStep = useCallback(
    (idx: number) => {
      const clamped = Math.min(tokens.length, Math.max(0, idx));
      const player = playerRef.current;
      if (!player) return;
      player.pause?.();
      player.alg = new Alg(tokens.slice(0, clamped).join(' '));
      setStepIdx(clamped);
    },
    [tokens],
  );

  const playAll = useCallback(() => {
    const player = playerRef.current;
    if (!player || !alg) return;
    player.pause?.();
    player.alg = new Alg(alg.toString());
    player.tempoScale = 1.15;
    setStepIdx(0);
    player.play?.();
  }, [alg]);

  return (
    <>
      <div ref={hostRef} className="cube-viewer">
        {!ready ? <span className="viewer-loading">Cargando visor 3D…</span> : null}
      </div>
      <div className="cube-controls">
        <button onClick={() => goToStep(0)} disabled={!alg} title="Volver al inicio">
          ⏮ Inicio
        </button>
        <button onClick={() => goToStep(stepIdx - 1)} disabled={!alg || stepIdx === 0}>
          ◀ Atrás
        </button>
        <span className="step-count">
          {stepIdx}/{tokens.length}
        </span>
        <button
          onClick={() => goToStep(stepIdx + 1)}
          disabled={!alg || stepIdx >= tokens.length}
        >
          Paso ▶
        </button>
        <button className="play-all" onClick={playAll} disabled={!alg}>
          ▶ Todo
        </button>
      </div>
    </>
  );
}
