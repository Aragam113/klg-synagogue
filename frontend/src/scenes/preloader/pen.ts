/**
 * The preloader's pen: one line from the left edge to the right one that draws a Star of David in the middle,
 * and the timing of the stroke (quick along the straight leads, slow while the star forms).
 */

/**
 * The whole stroke at full speed, ms: the shortest the preloader can be (fast connection, warm cache) — long enough
 * for the star to form; then a short hold and the layer leaves in .6 s. Slower loading holds the pen back (penStep).
 */
export const MIN_DRAW_MS = 1800;
/** From the preloader's start: past this the site shows whatever is still loading (it goes on in the background). */
export const CEIL_MS = 7000;
/** A stalled load still moves the pen: share of the star creeping in over time (time constant CREEP_MS). */
const CREEP = 0.55;
const CREEP_MS = 4000;
/** The pen eases into its allowance over ~this many ms (and picks up speed again as smoothly). */
const EASE_MS = 140;
/** How much slower the pen moves around the star than along the straight leads. */
export const STAR_SLOWDOWN = 2.25;

type P = [number, number];

/**
 * Vertices of the line: from the left edge along the horizon to the star, around the Star of David (two
 * triangles), out of its right side and on to the right edge. The star's sides cross the horizon exactly at
 * ±R/√3 (L and P below) — that is where the line enters and leaves. A hexagram plus two leads has four odd
 * vertices, so no single pass exists: the stroke retraces three short inner segments (L → P across the top of
 * the inner hexagon) on top of lines already drawn, which reads as one line. The first and the last segment
 * are the straight leads.
 */
export const starLinePoints = (w: number, h: number): P[] => {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.17;
  const s = (Math.sqrt(3) / 2) * R; // half-width of a triangle
  const q = R / Math.sqrt(3); // where the sides cross the horizon
  const at = (dx: number, dy: number): P => [cx + dx, cy + dy];
  // Up triangle: T (top), BR, BL. Down triangle: B (bottom), TL, TR.
  const T = at(0, -R);
  const BR = at(s, R / 2);
  const BL = at(-s, R / 2);
  const B = at(0, R);
  const TL = at(-s, -R / 2);
  const TR = at(s, -R / 2);
  const L = at(-q, 0);
  const P = at(q, 0);
  // Inner hexagon points on the way L → P over the top (sides cross at ±60°/120°).
  const I120 = at(-q / 2, -R / 2);
  const I60 = at(q / 2, -R / 2);
  return [
    [0, cy],
    L,
    // up triangle, starting and ending at L
    BL,
    BR,
    P,
    T,
    L,
    // down triangle, starting and ending at L
    TL,
    TR,
    P,
    B,
    L,
    // retrace to the right crossing over lines already drawn
    I120,
    I60,
    P,
    // and out to the right edge
    [w, cy],
  ];
};

const pt = ([x, y]: P) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/** SVG path `d` of the line (see starLinePoints). */
export const starLinePath = (w: number, h: number): string =>
  starLinePoints(w, h)
    .map((p, i) => `${i ? 'L' : 'M'} ${pt(p)}`)
    .join(' ');

const smooth = (x: number) => {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
};

/**
 * Keyframes for stroke-dashoffset (pathLength = 1): `offset` is the time fraction, `dash` the undrawn part.
 * The pen's speed is a function of the arc length: 1 on the leads, 1/STAR_SLOWDOWN around the star, blended
 * with smoothstep over ~6% of the path at each border; plus a soft start and a soft finish. The time to each
 * point is the integral of ds / v(s); sampled densely, linear between samples.
 */
export const penKeyframes = (
  w: number,
  h: number,
  samples = 120
): { offset: number; dash: number }[] => {
  const pts = starLinePoints(w, h);
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  const a = seg[0] / total; // star starts
  const b = 1 - seg[seg.length - 1] / total; // star ends
  const blend = 0.06;
  const slow = 1 / STAR_SLOWDOWN;
  const v = (s: number) => {
    const inStar = Math.min(
      smooth((s - a + blend / 2) / blend),
      smooth((b + blend / 2 - s) / blend)
    );
    const ends = 0.45 + 0.55 * Math.min(smooth(s / 0.05), smooth((1 - s) / 0.05));
    return (1 + (slow - 1) * inStar) * ends;
  };
  // integrate t(s) with the midpoint rule on a fine grid, keep `samples` keyframes
  const fine = samples * 8;
  const t = [0];
  for (let i = 0; i < fine; i++) t.push(t[i] + 1 / fine / v((i + 0.5) / fine));
  const T = t[fine];
  const out: { offset: number; dash: number }[] = [];
  for (let k = 0; k <= samples; k++) {
    const i = (k * fine) / samples;
    out.push({ offset: k === samples ? 1 : t[i] / T, dash: k === samples ? 0 : 1 - i / fine });
  }
  return out;
};

export interface PenProfile {
  /** Arc share (0..1) where the star starts / ends (the straight leads are outside). */
  starFrom: number;
  starTo: number;
  /** Arc share drawn at pen time tau (0..1 of the full-speed stroke). */
  arcAt: (tau: number) => number;
  /** Pen time at which arc share s is reached. */
  tauAt: (s: number) => number;
}

/** The full-speed stroke of penKeyframes as two lookups: pen time ↔ drawn arc share. */
export const penProfile = (w: number, h: number): PenProfile => {
  const kf = penKeyframes(w, h);
  const ts = kf.map((f) => f.offset);
  const ss = kf.map((f) => 1 - f.dash);
  const lerp = (xs: number[], ys: number[], x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let i = 1;
    while (xs[i] < x) i++;
    const k = xs[i] === xs[i - 1] ? 0 : (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
    return ys[i - 1] + (ys[i] - ys[i - 1]) * k;
  };
  const pts = starLinePoints(w, h);
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  return {
    starFrom: seg[0] / total,
    starTo: 1 - seg[seg.length - 1] / total,
    arcAt: (tau) => lerp(ts, ss, tau),
    tauAt: (s) => lerp(ss, ts, s),
  };
};

/**
 * How far (arc share) the pen may draw: the lead-in is free; the star is drawn as the loading `load` (0..1) goes —
 * or as a slow creep over `elapsedMs` when the loading stalls, so the line never looks frozen — but never finished
 * before everything is in; once it is (or past CEIL_MS) the whole line, out to the right edge.
 */
export const penAllowance = (load: number, elapsedMs: number, prof: PenProfile): number => {
  if (load >= 1 || elapsedMs >= CEIL_MS) return 1;
  const creep = CREEP * (1 - Math.exp(-Math.max(0, elapsedMs) / CREEP_MS));
  const k = Math.min(0.96, Math.max(0, load, creep));
  return prof.starFrom + (prof.starTo - prof.starFrom) * k;
};

export interface PenState {
  /** Pen time along the full-speed stroke, 0..1. */
  tau: number;
  /** Its speed, per ms. */
  v: number;
}

/**
 * One frame of the pen: towards the allowance `allowed` (arc share) at most at full speed (the whole stroke in
 * MIN_DRAW_MS, slow around the star as penKeyframes), slowing down smoothly as it comes close and picking up
 * speed smoothly when the allowance moves on; never past the allowance, never back.
 */
export const penStep = (
  st: PenState,
  dtMs: number,
  allowed: number,
  prof: PenProfile
): PenState => {
  const dt = Math.max(0, Math.min(100, dtMs));
  const lim = Math.max(st.tau, prof.tauAt(Math.min(1, allowed)));
  const full = 1 / MIN_DRAW_MS;
  // the speed that would stop the pen right at the limit, eased (time constant EASE_MS)
  const want = Math.min(full, (lim - st.tau) / EASE_MS);
  const v = st.v + (want - st.v) * (1 - Math.exp(-dt / (EASE_MS / 2)));
  const tau = Math.min(lim, st.tau + Math.max(0, v) * dt);
  // the last sliver: done
  return { tau: lim >= 1 && 1 - tau < 1e-3 ? 1 : tau, v };
};
