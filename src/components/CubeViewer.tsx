import { useEffect, useRef, useState } from 'react';
import 'cubing/twisty';
import { Alg } from 'cubing/alg';
import type { Alg as AlgType } from 'cubing/alg';

type TwistyPlayerElement = HTMLElement & {
  alg: AlgType;
  tempoScale: number;
  play?: () => void;
};

interface CubeViewerProps {
  alg: AlgType | null;
  restartSignal: number;
}

export function CubeViewer({ alg, restartSignal }: CubeViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayerElement | null>(null);
  const [ready, setReady] = useState(false);

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
    if (!player || !alg) return;
    player.alg = new Alg(alg.toString());
    player.tempoScale = 1.15;
    player.play?.();
  }, [alg, restartSignal, ready]);

  return (
    <div ref={hostRef} className="cube-viewer">
      {!ready ? <span className="viewer-loading">Cargando visor 3D…</span> : null}
    </div>
  );
}
