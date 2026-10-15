/**
 * Pure maths of the synagogue scroll scene: which frame to draw for a scroll progress, which loaded frame to
 * show while the wanted one is still downloading, cover-fit of a frame into the canvas, manifest parsing.
 */

/** Frame for scroll progress p (0..1): round(p*(N-1)), clamped. */
export const frameIndex = (p: number, n: number): number => {
  if (n <= 0) return 0;
  const c = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0));
  return Math.round(c * (n - 1));
};

/**
 * A frame `loaded` just arrived while `drawn` is on the canvas (-1 = nothing yet) and `target` is wanted:
 * redraw only when it is the wanted frame or strictly closer to it — not on every one of ~110 loads.
 */
export const improvesFrame = (target: number, loaded: number, drawn: number): boolean =>
  drawn < 0 || Math.abs(loaded - target) < Math.abs(drawn - target);

/** Nearest loaded frame to `target` (ties → the earlier one); -1 when nothing is loaded yet. */
export const nearestLoaded = (target: number, loaded: readonly boolean[]): number => {
  for (let d = 0; d < loaded.length; d++) {
    if (loaded[target - d]) return target - d;
    if (loaded[target + d]) return target + d;
  }
  return -1;
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** object-fit: cover of a src image into a dst box (centered crop). */
export const coverRect = (sw: number, sh: number, dw: number, dh: number): Rect => {
  const k = Math.max(dw / sw, dh / sh);
  const w = sw * k;
  const h = sh * k;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
};

export interface ScrubManifest {
  /** Absolute URLs of the frames in order. */
  frames: string[];
  width: number;
  height: number;
  credits: string;
  /** Frame shown statically (reduced motion) and while the phone set loads. */
  poster: number;
  /** Absolute URL of the light (1024px, 16:9) manifest: touch devices held in landscape. */
  light?: string;
  /** Absolute URL of the portrait phone set (406×720, build:scrub --touch): touch devices held in portrait. */
  touch?: string;
  /** Chapter film of the phone scene (?s=2, build:scrub --film-chapters): forward/reversed, portrait/landscape. */
  film?: SceneFilm;
}

export interface SceneFilm {
  /** portrait forward / reversed, landscape forward / reversed (absolute URLs) */
  p: string;
  pr: string;
  l: string;
  lr: string;
  /** seconds */
  duration: number;
  /** chapter holds, seconds of the forward film, ascending (0 … duration) */
  holds: number[];
}

/** manifest.json → absolute frame URLs (relative names resolve against base); null if unusable. */
export const parseManifest = (raw: unknown, base: string): ScrubManifest | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.frames)) return null;
  const names = r.frames.filter((f): f is string => typeof f === 'string' && f.length > 0);
  const width = Number(r.width);
  const height = Number(r.height);
  if (!names.length || !(width > 0) || !(height > 0)) return null;
  const dir = base.endsWith('/') ? base : base + '/';
  const abs = (f: string) => (f.startsWith('/') || /^https?:/.test(f) ? f : dir + f);
  const frames = names.map(abs);
  const light = typeof r.light === 'string' && r.light ? abs(r.light) : undefined;
  const touch = typeof r.touch === 'string' && r.touch ? abs(r.touch) : undefined;
  const fr = (r.film && typeof r.film === 'object' ? r.film : {}) as Record<string, unknown>;
  const files = (['p', 'pr', 'l', 'lr'] as const).map((k) =>
    typeof fr[k] === 'string' ? (fr[k] as string) : ''
  );
  const holds = Array.isArray(fr.holds)
    ? fr.holds.filter((t): t is number => typeof t === 'number')
    : [];
  const film: SceneFilm | undefined =
    files.every(Boolean) && Number(fr.duration) > 0 && holds.length >= 2
      ? {
          p: abs(files[0]),
          pr: abs(files[1]),
          l: abs(files[2]),
          lr: abs(files[3]),
          duration: Number(fr.duration),
          holds,
        }
      : undefined;
  const poster =
    typeof r.poster === 'number' && r.poster >= 0 && r.poster < frames.length
      ? Math.round(r.poster)
      : Math.round((frames.length - 1) / 2);
  return {
    frames,
    width,
    height,
    credits: typeof r.credits === 'string' ? r.credits : '',
    poster,
    ...(light ? { light } : {}),
    ...(touch ? { touch } : {}),
    ...(film ? { film } : {}),
  };
};

export interface Blend {
  /** Frame drawn first (fully opaque), a frame number of the set. */
  a: number;
  /** Frame drawn on top with `alpha` (= a when there is nothing to blend). */
  b: number;
  alpha: number;
}

/**
 * Download/decode order of a plan: the poster first, then ever finer even passes over the plan (every 8th slot,
 * every 4th, 2nd, the rest) — whenever the loading stops, what is in is spread evenly over the whole scene.
 */
export const loadOrder = (plan: readonly number[], poster: number): number[] => {
  const out: number[] = [];
  const seen = new Set<number>();
  const add = (f: number) => {
    if (seen.has(f)) return;
    seen.add(f);
    out.push(f);
  };
  if (plan.includes(poster)) add(poster);
  for (const step of [8, 4, 2, 1]) {
    for (let i = 0; i < plan.length; i += step) add(plan[i]);
    add(plan[plan.length - 1]);
  }
  return out.filter((f) => f !== undefined);
};

/**
 * What to draw for a fractional position `x` (0..N−1 over the set) given the decoded `plan` frames (`loaded` by
 * slot of the plan): the two decoded frames around x crossfaded (alpha = the fraction between them) when they are
 * at most `maxGap` frames apart (default: the plan's own neighbours only); otherwise the decoded frame nearest to x
 * alone — never a crossfade of far frames, which reads as a frozen double image. Nothing decoded → null.
 */
export const blendCached = (
  x: number,
  plan: readonly number[],
  loaded: readonly boolean[],
  maxGap?: number
): Blend | null => {
  if (!plan.length) return null;
  const last = plan[plan.length - 1];
  const c = Math.min(last, Math.max(plan[0], Number.isFinite(x) ? x : 0));
  // decoded slot at or before c and at or after c
  let lo = -1;
  let hi = -1;
  for (let j = 0; j < plan.length; j++) {
    if (!loaded[j]) continue;
    if (plan[j] <= c) lo = j;
    if (plan[j] >= c && hi < 0) hi = j;
  }
  if (lo < 0 && hi < 0) return null;
  if (lo >= 0 && plan[lo] === c) return { a: c, b: c, alpha: 0 };
  if (lo >= 0 && hi >= 0) {
    const a = plan[lo];
    const b = plan[hi];
    const gap = b - a;
    const allowed = maxGap ?? (hi === lo + 1 ? gap : -1);
    if (gap <= allowed) return { a, b, alpha: (c - a) / gap };
  }
  const near =
    lo < 0 ? plan[hi] : hi < 0 ? plan[lo] : c - plan[lo] <= plan[hi] - c ? plan[lo] : plan[hi];
  return { a: near, b: near, alpha: 0 };
};

/**
 * Phones: `k` key frames spread evenly over a set of `n` (the first and the last included) — the scene shows these
 * as decoded `<img>` layers crossfaded by CSS instead of scrubbing every frame on a canvas.
 */
export const keyFrames = (n: number, k: number): number[] => {
  if (n <= 0) return [];
  if (k >= n) return Array.from({ length: n }, (_, i) => i);
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    const f = Math.round((i * (n - 1)) / Math.max(1, k - 1));
    if (out[out.length - 1] !== f) out.push(f);
  }
  return out;
};

/**
 * Phone scene, frames (?s=1): how many frames of the portrait set to decode (ImageBitmaps at 540 px height, 0.66 MB
 * each) by `navigator.deviceMemory` (GB): ≥ 4 or unknown (Safari, Firefox) → 120, 2–3 → 80, less → 54.
 */
export const touchFrameCount = (deviceMemory: number | undefined): number => {
  if (deviceMemory === undefined || !Number.isFinite(deviceMemory) || deviceMemory >= 4) return 120;
  if (deviceMemory >= 2) return 80;
  return 54;
};

/** Chapter stop inside a chapter: where the auto-settle lands going down (touch-scroll: local .22). */
const STOP = 0.22;

/**
 * Phone scene, film (?s=2): the film time the scroll points to, for the pinned progress `p` and the chapter holds
 * (seconds, one per chapter, 0 … T). The chapter stops (0 for the first, (k + .22)/n after) map to the holds, the
 * film runs linearly between them — every pixel of scroll moves the target, a chapter at rest is on its hold.
 */
export const filmTarget = (p: number, holds: readonly number[]): number => {
  const n = holds.length;
  if (!n) return 0;
  if (!(p > 0)) return holds[0];
  let prevP = 0;
  for (let k = 1; k < n; k++) {
    const stop = (k + STOP) / n;
    if (p <= stop) return holds[k - 1] + ((p - prevP) / (stop - prevP)) * (holds[k] - holds[k - 1]);
    prevP = stop;
  }
  return holds[n - 1];
};

/** Phone scene, film: the chapter whose hold is nearest to the camera — its text is on screen. */
export const filmChapterOf = (pos: number, holds: readonly number[]): number => {
  let best = 0;
  for (let k = 1; k < holds.length; k++)
    if (Math.abs(holds[k] - pos) < Math.abs(holds[best] - pos)) best = k;
  return best;
};

/** Phone scene, film: catch-up gain (1/s: a lag of 1 s of film adds 4× — a 0.25 s time constant) and the rate cap. */
export const FILM_GAIN = 4;
export const FILM_MAX_RATE = 6;

/**
 * Phone scene, film: the signed playback rate that keeps the camera on the scroll — the scroll's own pace in film
 * seconds per second (`v`) plus a catch-up proportional to the lag `e` (target − camera), capped at ±FILM_MAX_RATE.
 * Positive — the forward file, negative — the reversed one.
 */
export const filmRate = (e: number, v: number): number => {
  const r = v + FILM_GAIN * e;
  const c = Math.max(-FILM_MAX_RATE, Math.min(FILM_MAX_RATE, r));
  return Math.abs(c) < 1e-9 ? 0 : Math.round(c * 1000) / 1000;
};
