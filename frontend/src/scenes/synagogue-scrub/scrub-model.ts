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
  /** Frame shown statically on touch / reduced motion. */
  poster: number;
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
  const frames = names.map((f) => (f.startsWith('/') || /^https?:/.test(f) ? f : dir + f));
  const poster =
    typeof r.poster === 'number' && r.poster >= 0 && r.poster < frames.length
      ? Math.round(r.poster)
      : Math.round((frames.length - 1) / 2);
  return { frames, width, height, credits: typeof r.credits === 'string' ? r.credits : '', poster };
};
