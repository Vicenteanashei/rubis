import type { ReactNode } from 'react';
import { formatMs } from '../lib/format';
import type { TimerPhase } from '../hooks/useTimer';
import type { Penalty } from '../types';

interface TimerViewProps {
  phase: TimerPhase;
  display: number | null;
  holding: boolean;
  lastPenalty: Penalty;
  onPointerDown: () => void;
  onPointerUp: () => void;
}

export function TimerView({
  phase,
  display,
  holding,
  lastPenalty,
  onPointerDown,
  onPointerUp,
}: TimerViewProps) {
  let className = 'timer-zone';
  let content: ReactNode;

  if (phase === 'inspection') {
    className += ' inspecting';
    const seconds = Math.ceil((display ?? 15_000) / 1000);
    const penalized = seconds <= 0;
    content = (
      <>
        <span
          className={`timer-text${penalized ? ' danger' : seconds <= 5 ? ' warn' : ''}`}
        >
          {Math.max(0, seconds)}
        </span>
        <span className="timer-sub">inspección{penalized ? ' · +2' : ''}</span>
      </>
    );
  } else if (phase === 'running') {
    className += ' running';
    content = <span className="timer-text">{formatMs(display)}</span>;
  } else if (display == null) {
    className += ' idle';
    content = <span className="timer-text muted">Mantén ESPACIO o toca aquí</span>;
  } else {
    className += holding ? ' holding' : ' idle';
    content = (
      <>
        <span className={`timer-text${holding ? '' : ' dimmed'}`}>
          {formatMs(display)}
          {lastPenalty && lastPenalty !== 'DNF' ? (
            <em className="badge plus2">+2</em>
          ) : null}
        </span>
        <span className="timer-sub">siguiente intento</span>
      </>
    );
  }

  return (
    <div
      className={className}
      role="button"
      tabIndex={-1}
      aria-label="zona del timer"
      onPointerDown={(e) => {
        e.preventDefault();
        onPointerDown();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        onPointerUp();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {content}
      {holding ? <span className="hold-cue">¡suelta!</span> : null}
    </div>
  );
}
