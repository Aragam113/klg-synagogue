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
  /** Absolute URL of the light (1024px) manifest for phones, if build:scrub made one. */
  light?: string;
  /** All-intra scrub video for phones (build:scrub --video): the main path on touch, the frames are the fallback. */
  video?: ScrubVideo;
}

export interface ScrubVideo {
  /** Absolute URL of the mp4 (H.264, every frame a keyframe). */
  src: string;
  frames: number;
  fps: number;
}

const parseVideo = (v: unknown, abs: (f: string) => string): ScrubVideo | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const r = v as Record<string, unknown>;
  const frames = Number(r.frames);
  const fps = Number(r.fps);
  if (typeof r.src !== 'string' || !r.src || !(frames >= 2) || !(fps > 0)) return undefined;
  return { src: abs(r.src), frames: Math.round(frames), fps };
};

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
  const video = parseVideo(r.video, abs);
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
    ...(video ? { video } : {}),
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
 * Inter-frame blending for a fractional frame position `x` (p·(N−1)): only REAL neighbours i = floor(x) and i+1,
 * both loaded, are crossfaded (alpha = the fraction). Otherwise the loaded frame nearest to round(x) is drawn alone —
 * never a crossfade of far frames (the coarse pass), which reads as a frozen double image. Nothing loaded → null.
 */
export const blendFrames = (x: number, loaded: readonly boolean[]): Blend | null => {
  const n = loaded.length;
  if (!n) return null;
  const c = Math.min(n - 1, Math.max(0, Number.isFinite(x) ? x : 0));
  const i = Math.floor(c);
  const f = c - i;
  if (f === 0 && loaded[i]) return { a: i, b: i, alpha: 0 };
  if (loaded[i] && loaded[i + 1]) return { a: i, b: i + 1, alpha: f };
  const k = nearestLoaded(Math.round(c), loaded);
  return k < 0 ? null : { a: k, b: k, alpha: 0 };
};

/** Video seek time for scroll progress p: the middle of frame round(p·(N−1)) — exact frame, no boundary rounding. */
export const videoTime = (p: number, frames: number, fps: number): number =>
  (frameIndex(p, frames) + 0.5) / fps;

/**
 * Seek target while the video is still downloading: `t` itself inside a downloaded range, otherwise the nearest
 * downloaded frame (half a frame `half` inside a range end). A seek into the void would stall the picture on a range
 * request and break the linear download; the nearest downloaded frame keeps it moving. No ranges → `t`.
 */
export const bufferedTime = (
  t: number,
  ranges: readonly (readonly [number, number])[],
  half: number
): number => {
  if (!ranges.length) return t;
  let best = t;
  let gap = Infinity;
  for (const [s, e] of ranges) {
    if (t >= s && t <= e) return t;
    const near = t < s ? s : Math.max(s, e - half);
    const d = Math.abs(near - t);
    if (d < gap) {
      gap = d;
      best = near;
    }
  }
  return best;
};

/** First pass of the phone set: every `step`-th frame plus the last — the scene scrubs once these are in. */
export const coarsePass = (n: number, step: number): number[] => {
  const k = Math.max(1, Math.round(step));
  const out: number[] = [];
  for (let i = 0; i < n; i += k) out.push(i);
  if (n > 0 && out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
};
