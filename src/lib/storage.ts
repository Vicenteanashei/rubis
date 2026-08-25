import type { Settings, SolveRecord } from '../types';

const SOLVES_KEY = 'rubik-timer.solves.v1';
const SETTINGS_KEY = 'rubik-timer.settings.v1';

export function loadSolves(): SolveRecord[] {
  try {
    const raw = localStorage.getItem(SOLVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSolves(solves: SolveRecord[]): void {
  try {
    localStorage.setItem(SOLVES_KEY, JSON.stringify(solves));
  } catch {
    return;
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { inspectionEnabled: false, ...JSON.parse(raw) };
    }
  } catch {
    return { inspectionEnabled: false };
  }
  return { inspectionEnabled: false };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}
