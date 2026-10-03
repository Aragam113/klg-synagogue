/**
 * Pure maths of the touch scroll path (html[data-touch]): native scroll, scrollY polled every rAF, `--p` eases to it;
 * after the finger and the inertia stop inside a snapping scene the page glides to a chapter stop (snapTarget).
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

/** Absolute scrollY of the chapter stops of a pinned scene (`top`, full `height` incl. the sticky screen, `vh`). */
export const sceneSnapPoints = (top: number, height: number, vh: number, n: number): number[] => {
  const runway = Math.max(0, height - vh);
  return chapterStops(n).map((p) => top + p * runway);
};

/** Pixels within which the page already counts as resting on a stop. */
const ON_STOP = 2;
/** Share of a chapter (capped by the same share of the screen) after which the page goes on to the next stop. */
const FORWARD = 0.3;
/** Just inside the scene (share of the screen past its first stop) the page is left alone: entering / leaving it. */
const ENTRY = 0.25;

/**
 * Stop a scroll resting at `y` is pulled to, among the chapter `points` (ascending), after a movement in `dir`:
 * on to the next stop once the page went FORWARD (30%) of the gap — but no more than 30% of the screen `vh` —
 * otherwise back to the stop it left. So it never pulls against the movement farther than 0.3·vh. With no direction
 * the nearest. Null outside the scene, at its entry (first 25% of a screen), at or past the last stop (the exit),
 * or when already on a stop.
 */
export const snapTarget = (
  y: number,
  points: readonly number[],
  dir: -1 | 0 | 1,
  vh: number
): number | null => {
  const last = points[points.length - 1];
  if (points.length < 2 || y < points[0] + ENTRY * vh || y >= last - ON_STOP) return null;
  if (points.some((p) => Math.abs(p - y) <= ON_STOP)) return null;
  let i = 0;
  while (i < points.length - 2 && y > points[i + 1]) i++;
  const a = points[i];
  const b = points[i + 1];
  const need = Math.min(FORWARD * (b - a), FORWARD * vh);
  if (dir > 0) return y - a >= need ? b : a;
  if (dir < 0) return b - y >= need ? a : b;
  return y - a < b - y ? a : b;
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

/** Glide duration in proportion to the distance: 300 ms for a short pull, up to 700 ms for a screen and more. */
export const snapDuration = (distance: number, vh: number): number =>
  Math.round(Math.min(700, Math.max(300, 280 + (Math.abs(distance) / Math.max(1, vh)) * 420)));
