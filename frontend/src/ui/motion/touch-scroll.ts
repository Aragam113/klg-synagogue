/**
 * Pure maths of the touch scroll path (html[data-touch]): native scroll, scrollY polled every rAF, `--p` eases to it;
 * after the finger and the inertia stop between two chapters of a snapping scene the page glides into the next or the
 * previous one along the movement (snapProgress).
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

/**
 * Chapter choreography of the pinned scenes (scrub.css, site.css .pinned): a chapter's text is fully in over local
 * progress IN_END … OUT_START (the scene leaves .78, `<Pinned>` .72 — the earlier one counts); in between two chapters
 * both texts are half-faded.
 */
const IN_END = 0.2;
const OUT_START = 0.72;
/** A glide lands this much inside the readable band (forward: local .22; back: local .70). */
const LAND = 0.02;

/**
 * Where a pinned scene with `n` chapters resting at pin progress `p` glides, after a movement in `dir`: only when the
 * page rests BETWEEN two chapters (both texts half-faded: local > OUT_START of one, < IN_END of the next) — on to the
 * next chapter just fully in when moving down, back to the previous one still fully in when moving up, the nearer
 * with no direction. Never against the movement and never farther than half a chapter; resting on a readable chapter,
 * at the entry (the first chapter opening) or at the exit → null (left alone).
 */
export const snapProgress = (p: number, n: number, dir: -1 | 0 | 1): number | null => {
  if (n < 2 || !Number.isFinite(p)) return null;
  for (let k = 1; k < n; k++) {
    const from = (k - 1 + OUT_START) / n;
    const to = (k + IN_END) / n;
    if (p <= from || p >= to) continue;
    const fwd = (k + IN_END + LAND) / n;
    const back = (k - 1 + OUT_START - LAND) / n;
    if (dir > 0) return fwd;
    if (dir < 0) return back;
    return p - back <= fwd - p ? back : fwd;
  }
  return null;
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

/** Glide easing cubic-bezier(.45, 0, .25, 1): a soft start from rest and a soft landing (no jolt either way). */
export const easeGlide = bezier(0.45, 0, 0.25, 1);

/** Glide duration in proportion to the distance: 350 ms for a short one, up to 800 ms for half a screen and more. */
export const snapDuration = (distance: number, vh: number): number =>
  Math.round(Math.min(800, Math.max(350, 330 + (Math.abs(distance) / Math.max(1, vh)) * 940)));
