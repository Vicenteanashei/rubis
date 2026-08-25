import { useCallback, useEffect, useRef, useState } from 'react';
import type { Penalty } from '../types';

export type TimerPhase = 'idle' | 'inspection' | 'running';

const HOLD_CUE_MS = 300;
const INSPECTION_MS = 15_000;
const INSPECTION_EXTRA_MS = 2_000;

export interface NewRecord {
  scramble: string;
  rawMs: number | null;
  penalty: Penalty;
}

interface UseTimerOptions {
  inspectionEnabled: boolean;
  onComplete: (record: NewRecord) => void;
  getScramble: () => string | null;
}

export function useTimer({ inspectionEnabled, onComplete, getScramble }: UseTimerOptions) {
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [display, setDisplay] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [lastPenalty, setLastPenalty] = useState<Penalty>(null);

  const phaseRef = useRef<TimerPhase>('idle');
  const startRef = useRef(0);
  const inspectionEndRef = useRef(0);
  const penaltyRef = useRef<Penalty>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const suppressKeyUpRef = useRef(false);
  const suppressPointerUpRef = useRef(false);
  const inspectionRef = useRef(inspectionEnabled);
  inspectionRef.current = inspectionEnabled;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const getScrambleRef = useRef(getScramble);
  getScrambleRef.current = getScramble;

  const go = useCallback((next: TimerPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const finish = useCallback(
    (rawMs: number | null, penalty: Penalty) => {
      penaltyRef.current = null;
      setLastPenalty(penalty);
      setDisplay(rawMs);
      go('idle');
      onCompleteRef.current({
        scramble: getScrambleRef.current() ?? '',
        rawMs,
        penalty,
      });
    },
    [go],
  );

  const startInspection = useCallback(() => {
    penaltyRef.current = null;
    inspectionEndRef.current = performance.now() + INSPECTION_MS;
    setHolding(false);
    go('inspection');
  }, [go]);

  const startRun = useCallback(() => {
    if (phaseRef.current === 'inspection' && performance.now() > inspectionEndRef.current) {
      penaltyRef.current = '+2';
    } else {
      penaltyRef.current = null;
    }
    startRef.current = performance.now();
    setHolding(false);
    go('running');
  }, [go]);

  const beginHoldCue = useCallback(() => {
    if (holdTimeoutRef.current !== null) return;
    holdTimeoutRef.current = window.setTimeout(() => setHolding(true), HOLD_CUE_MS);
  }, []);

  const cancelHoldCue = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    setHolding(false);
  }, []);

  const stop = useCallback(() => {
    finish(performance.now() - startRef.current, penaltyRef.current);
  }, [finish]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        if (phaseRef.current === 'inspection') {
          cancelHoldCue();
          go('idle');
        }
        return;
      }
      if (event.code !== 'Space' || event.repeat) return;
      event.preventDefault();
      switch (phaseRef.current) {
        case 'idle':
          beginHoldCue();
          break;
        case 'inspection':
          startRun();
          break;
        case 'running':
          suppressKeyUpRef.current = true;
          stop();
          break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (suppressKeyUpRef.current) {
        suppressKeyUpRef.current = false;
        return;
      }
      if (phaseRef.current !== 'idle') return;
      cancelHoldCue();
      if (inspectionRef.current) startInspection();
      else startRun();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [beginHoldCue, cancelHoldCue, go, startInspection, startRun, stop]);

  useEffect(() => {
    if (phase !== 'inspection' && phase !== 'running') return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      if (phaseRef.current === 'inspection') {
        const remaining = inspectionEndRef.current - now;
        if (remaining <= -INSPECTION_EXTRA_MS) {
          cancelHoldCue();
          finish(null, 'DNF');
          return;
        }
        setDisplay(Math.max(0, remaining));
      } else {
        setDisplay(now - startRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, cancelHoldCue, finish]);

  const pointerDown = useCallback(() => {
    if (phaseRef.current === 'idle') beginHoldCue();
    else if (phaseRef.current === 'inspection') startRun();
    else {
      suppressPointerUpRef.current = true;
      stop();
    }
  }, [beginHoldCue, startRun, stop]);

  const pointerUp = useCallback(() => {
    if (suppressPointerUpRef.current) {
      suppressPointerUpRef.current = false;
      return;
    }
    if (phaseRef.current !== 'idle') return;
    cancelHoldCue();
    if (inspectionRef.current) startInspection();
    else startRun();
  }, [cancelHoldCue, startInspection, startRun]);

  return { phase, display, holding, lastPenalty, pointerDown, pointerUp };
}
