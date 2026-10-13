/**
 * What the page is still loading, for the preloader: named tasks report their fraction 0..1 (1 = done).
 * The scroll scene reports its frame cache as `scene`; the preloader itself watches fonts, API answers and images.
 * Module state (one page); no React.
 */
type Listener = () => void;

const tasks = new Map<string, number>();
const listeners = new Set<Listener>();

/** Sets the fraction of task `key` (clamped 0..1; never goes back once it reached 1). */
export const reportLoad = (key: string, fraction: number): void => {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  if (tasks.get(key) === 1 || tasks.get(key) === f) return;
  tasks.set(key, f);
  listeners.forEach((l) => l());
};

/** Fraction of task `key`; undefined while it never reported. */
export const loadOf = (key: string): number | undefined => tasks.get(key);

export const onLoadChange = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** Tests: forget every task. */
export const resetLoads = (): void => {
  tasks.clear();
};
