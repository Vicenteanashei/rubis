import Cube from 'cubejs';

interface SolveRequest {
  id: number;
  scramble: string;
}

type SolveResponse =
  | { id: number; ok: true; solution: string }
  | { id: number; ok: false; error: string };

const ctx = self as unknown as {
  postMessage(message: SolveResponse): void;
  onmessage: ((event: MessageEvent<SolveRequest>) => void) | null;
};

ctx.onmessage = (event) => {
  const { id, scramble } = event.data;
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

Cube.initSolver();
