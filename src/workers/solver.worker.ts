import Cube from '../lib/cubejs.vendor';

interface SolveRequest {
  id: number;
  scramble: string;
}

type SolveResponse =
  | { type: 'ready' }
  | { type: 'init-error'; error: string }
  | { id: number; ok: true; solution: string }
  | { id: number; ok: false; error: string };

const ctx = self as unknown as {
  postMessage(message: SolveResponse): void;
  onmessage: ((event: MessageEvent<SolveRequest>) => void) | null;
};

let initError: string | null = null;

ctx.onmessage = (event) => {
  const { id, scramble } = event.data;
  if (initError) {
    ctx.postMessage({ id, ok: false, error: initError });
    return;
  }
  try {
    const cube = new Cube();
    cube.move(scramble);
    const solution = cube.solve();
    ctx.postMessage({ id, ok: true, solution });
  } catch (err) {
    ctx.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

try {
  Cube.initSolver();
  ctx.postMessage({ type: 'ready' });
} catch (err) {
  initError = err instanceof Error ? err.message : String(err);
  ctx.postMessage({ type: 'init-error', error: initError });
}
