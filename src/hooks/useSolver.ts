import { useCallback, useEffect, useRef } from 'react';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'init-error'; error: string }
  | { id: number; ok: true; solution: string }
  | { id: number; ok: false; error: string };

interface Pending {
  resolve: (solution: string) => void;
  reject: (error: Error) => void;
}

const INIT_TIMEOUT_MS = 30000;
const SOLVE_TIMEOUT_MS = 60000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function useSolver() {
  const workerRef = useRef<Worker | null>(null);
  const failedRef = useRef(false);
  const readyRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<Map<number, Pending>>(new Map());
  const idRef = useRef(0);

  const ensureWorker = useCallback((): Promise<void> => {
    if (workerRef.current && !failedRef.current && readyRef.current) {
      return readyRef.current;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    failedRef.current = false;
    pendingRef.current.clear();
    const worker = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    readyRef.current = new Promise<void>((resolveReady, rejectReady) => {
      let settled = false;
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if ('type' in data) {
          if (settled) return;
          settled = true;
          if (data.type === 'ready') resolveReady();
          else rejectReady(new Error(`Solver falló al iniciar: ${data.error}`));
          return;
        }
        const pending = pendingRef.current.get(data.id);
        if (!pending) return;
        pendingRef.current.delete(data.id);
        if (data.ok) pending.resolve(data.solution);
        else pending.reject(new Error(data.error));
      };
      worker.onerror = (event) => {
        if (!settled) {
          settled = true;
          rejectReady(new Error(event.message || 'Error cargando el solver'));
        }
        failedRef.current = true;
        for (const pending of pendingRef.current.values()) {
          pending.reject(new Error(event.message || 'Error en el solver'));
        }
        pendingRef.current.clear();
      };
    });

    return readyRef.current;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const solve = useCallback(
    (scramble: string): Promise<string> =>
      withTimeout(
        ensureWorker().then(
          () =>
            new Promise<string>((resolve, reject) => {
              const worker = workerRef.current;
              if (!worker || failedRef.current) {
                reject(new Error('Solver no disponible'));
                return;
              }
              const id = ++idRef.current;
              pendingRef.current.set(id, { resolve, reject });
              worker.postMessage({ id, scramble });
            }),
        ),
        SOLVE_TIMEOUT_MS,
        'El solver tardó demasiado. Reinicia la página e inténtalo de nuevo.',
      ),
    [ensureWorker],
  );

  useEffect(() => {
    void ensureWorker().catch(() => {
      /* se reintenta en la primera solicitud */
    });
  }, [ensureWorker]);

  return { solve };
}
