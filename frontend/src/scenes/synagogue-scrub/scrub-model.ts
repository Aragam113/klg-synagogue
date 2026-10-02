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
  /** Absolute URL of the light (640px) manifest for phones, if build:scrub made one. */
  light?: string;
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
  };
};

export interface Blend {
  /** Frame drawn first (fully opaque). */
  a: number;
  /** Frame drawn on top with `alpha` (= a when there is nothing to blend). */
  b: number;
  alpha: number;
}

/**
 * Inter-frame blending for a fractional frame position `x` (p·(N−1)): the nearest loaded frame at or before `x` and
 * the nearest loaded one after it, `alpha` = how far `x` is between them. All loaded → neighbours i, i+1; on the
 * coarse pass (every 4th) → a longer crossfade. Loaded only on one side → that frame alone; nothing → null.
 */
export const blendFrames = (x: number, loaded: readonly boolean[]): Blend | null => {
  const n = loaded.length;
  if (!n) return null;
  const c = Math.min(n - 1, Math.max(0, Number.isFinite(x) ? x : 0));
  let a = Math.floor(c);
  while (a >= 0 && !loaded[a]) a--;
  let b = Math.ceil(c) === a ? a : Math.ceil(c);
  while (b < n && b !== a && !loaded[b]) b++;
  if (b >= n) b = -1;
  if (a < 0 && b < 0) return null;
  if (a < 0) return { a: b, b, alpha: 0 };
  if (b < 0 || b === a) return { a, b: a, alpha: 0 };
  return { a, b, alpha: (c - a) / (b - a) };
};

/** First pass of the phone set: every `step`-th frame plus the last — the scene scrubs once these are in. */
export const coarsePass = (n: number, step: number): number[] => {
  const k = Math.max(1, Math.round(step));
  const out: number[] = [];
  for (let i = 0; i < n; i += k) out.push(i);
  if (n > 0 && out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
};
