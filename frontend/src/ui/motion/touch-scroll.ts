/**
 * Pure maths of the touch scroll path (html[data-touch]): native scroll, scrollY polled every rAF, `--p` eases to it;
 * after the finger and the inertia stop inside a snapping scene the page glides to the nearest chapter stop.
 * The desktop (fine pointer) never uses it.
 */

/** Share of the `--p` gap closed per 60 Hz frame on touch (≈ 75 ms time constant: no steps, no «cotton»). */
export const TOUCH_LERP = 0.2;

/** Frame-rate independent lerp: `k` is the share of the gap closed per 60 Hz frame; snaps within 5e-4. */
export const approach = (cur: number, target: number, k: number, dtMs: number): number => {
  const step = 1 - Math.pow(1 - k, Math.max(0, dtMs) / (1000 / 60));
  const next = cur + (target - cur) * step;
  return Math.abs(target - next) < 5e-4 ? target : next;
};

/** Where a chapter is fully in (its local progress): chapters enter over local 0..0.2 and leave over 0.78..1. */
const REST = 0.45;

/**
 * Pin-progress stops of a scene with `n` chapters: the first chapter at the very start, the middle ones at local
 * progress .45 (fully in, text still), the last at the end of the runway.
 */
export const chapterStops = (n: number): number[] => {
  if (n <= 1) return [0, 1];
  const mid = Array.from({ length: n - 2 }, (_, i) => (i + 1 + REST) / n);
  return [0, ...mid, 1];
};

/**
 * Absolute scrollY of the stops of a pinned scene (`top`, full `height` incl. the sticky screen, viewport `vh`):
 * the chapter stops along the runway plus the exit (the scene's bottom at the viewport top).
 */
export const sceneSnapPoints = (top: number, height: number, vh: number, n: number): number[] => {
  const runway = Math.max(0, height - vh);
  return [...chapterStops(n).map((p) => top + p * runway), top + height];
};

/** Pixels within which the page already counts as resting on a stop. */
const ON_STOP = 2;

/**
 * Stop a scroll resting at `y` is pulled to: the one before or after it among `points` (ascending). With no
 * direction the nearest; the last movement direction `dir` wins from 35% of the gap. Null outside the points or
 * when already on a stop.
 */
export const snapTarget = (
  y: number,
  points: readonly number[],
  dir: -1 | 0 | 1
): number | null => {
  if (points.length < 2 || y < points[0] - ON_STOP || y > points[points.length - 1] + ON_STOP)
    return null;
  if (points.some((p) => Math.abs(p - y) <= ON_STOP)) return null;
  let i = 0;
  while (i < points.length - 2 && y > points[i + 1]) i++;
  const a = points[i];
  const b = points[i + 1];
  const t = (y - a) / (b - a);
  const threshold = dir > 0 ? 0.35 : dir < 0 ? 0.65 : 0.5;
  return t >= threshold ? b : a;
};

/** cubic-bezier(x1, y1, x2, y2) as a function of time 0..1 (Newton + bisection on x). */
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (s: number) => ((ax * s + bx) * s + cx) * s;
  const sy = (s: number) => ((ay * s + by) * s + cy) * s;
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0;
    let hi = 1;
    let s = t;
    for (let k = 0; k < 20; k++) {
      const x = sx(s) - t;
      if (Math.abs(x) < 1e-6) break;
      if (x > 0) hi = s;
      else lo = s;
      s = (lo + hi) / 2;
    }
    return sy(s);
  };
};

/** The kit easing `--ease: cubic-bezier(0.22, 1, 0.36, 1)` (site.css). */
export const easeKit = bezier(0.22, 1, 0.36, 1);

/** Glide duration: 500 ms for a short pull, up to 800 ms for a screen and more. */
export const snapDuration = (distance: number, vh: number): number =>
  Math.round(Math.min(800, Math.max(500, 450 + (Math.abs(distance) / Math.max(1, vh)) * 350)));
