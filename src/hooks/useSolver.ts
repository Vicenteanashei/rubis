import { useCallback, useEffect, useRef } from 'react';

interface SolveOk {
  id: number;
  ok: true;
  solution: string;
}

interface SolveErr {
  id: number;
  ok: false;
  error: string;
}

type SolverResponse = SolveOk | SolveErr;

interface Pending {
  resolve: (solution: string) => void;
  reject: (error: Error) => void;
}

export function useSolver() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, Pending>>(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<SolverResponse>) => {
      const pending = pendingRef.current.get(event.data.id);
      if (!pending) return;
      pendingRef.current.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.solution);
      else pending.reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || 'Error en el solver');
      for (const pending of pendingRef.current.values()) {
        pending.reject(error);
      }
      pendingRef.current.clear();
    };
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const solve = useCallback((scramble: string): Promise<string> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('Solver no disponible'));
    const id = ++idRef.current;
    return new Promise<string>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ id, scramble });
    });
  }, []);

  return { solve };
}
