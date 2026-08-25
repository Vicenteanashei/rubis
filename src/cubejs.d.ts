declare module 'cubejs' {
  export default class Cube {
    constructor(other?: Cube);
    move(alg: string): this;
    asString(): string;
    isSolved(): boolean;
    static random(): Cube;
    static initSolver(): void;
    solve(maxDepth?: number): string;
  }
}
