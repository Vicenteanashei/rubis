import { useEffect, useRef } from 'react';
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
  const algRef = useRef<AlgType | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const player = document.createElement('twisty-player') as TwistyPlayerElement;
    player.setAttribute('background', 'none');
    player.setAttribute('control-panel', 'none');
    player.style.width = '100%';
    player.style.height = '100%';
    host.appendChild(player);
    playerRef.current = player;
    return () => {
      player.remove();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    algRef.current = alg;
    const player = playerRef.current;
    if (!player || !alg) return;
    player.alg = new Alg(alg.toString());
    player.tempoScale = 1.15;
    player.play?.();
  }, [alg]);

  useEffect(() => {
    const player = playerRef.current;
    const current = algRef.current;
    if (!player || !current) return;
    player.alg = new Alg(current.toString());
    player.play?.();
  }, [restartSignal]);

  return <div ref={hostRef} className="cube-viewer" />;
}
