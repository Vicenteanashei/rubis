declare const Cube: {
  new (): {
    move(alg: string): unknown;
    solve(maxDepth?: number): string;
    asString(): string;
  };
  initSolver(): void;
};

export default Cube;
