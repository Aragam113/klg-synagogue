import { CEIL_MS } from './pen';

/**
 * Overall loading the preloader waits for: tasks with their fractions 0..1, weighted by how heavy they are —
 * the scroll scene's frame cache (~5 MB on a phone) weighs most, fonts and the home API answers less, images least.
 */
export interface LoadTask {
  key: string;
  /** 0..1 (clamped). */
  f: number;
}

const WEIGHT: Record<string, number> = { fonts: 1, api: 1, images: 0.5, scene: 3 };

export const loadShare = (tasks: readonly LoadTask[]): number => {
  let sum = 0;
  let w = 0;
  for (const t of tasks) {
    const k = WEIGHT[t.key] ?? 1;
    sum += k * Math.min(1, Math.max(0, Number.isFinite(t.f) ? t.f : 0));
    w += k;
  }
  return w ? sum / w : 1;
};

/** The scene has this long (from the preloader's start) to report anything at all. */
const SCENE_START_MS = 2500;
/** Below this much loading time there is no rate to judge by yet. */
const RATE_MS = 800;

/**
 * Is the scroll scene's frame cache worth waiting for? Only while it can be in before the ceiling at its current pace
 * (rate = f / loadingMs since its first report): on a slow network the line does not hold the site back for a cache
 * that will not make it — the scene goes on loading in the background with its fallback. `f` undefined — nothing
 * reported yet (worth a moment, SCENE_START_MS).
 */
export const sceneWorthWaiting = (s: {
  f: number | undefined;
  loadingMs: number;
  elapsedMs: number;
}): boolean => {
  if (s.f === undefined) return s.elapsedMs < SCENE_START_MS;
  if (s.f >= 1 || s.loadingMs < RATE_MS) return true;
  if (s.f <= 0) return false;
  const eta = ((1 - s.f) * s.loadingMs) / s.f;
  return s.elapsedMs + eta <= CEIL_MS;
};
