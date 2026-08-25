export type Penalty = null | '+2' | 'DNF';

export interface SolveRecord {
  id: string;
  date: number;
  scramble: string;
  rawMs: number | null;
  penalty: Penalty;
}

export interface Settings {
  inspectionEnabled: boolean;
}
