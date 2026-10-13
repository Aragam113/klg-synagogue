/**
 * Downloads frames of the scroll scene and keeps them DECODED, ready for `drawImage` without any work on the main
 * thread: `createImageBitmap` (off-thread decode, optional resize at decode time), or — where it is missing or cannot
 * decode the very first frame — an `<img>` after `img.decode()`. Frames come in `order` with `workers` downloads at a time; each one is reported
 * through `onFrame` once it can be drawn. A decode that fails (out of memory on a weak phone) stops the cache: what is
 * in stays and is drawn. `cancel()` aborts the downloads and frees the bitmaps.
 */
export type Drawable = ImageBitmap | HTMLImageElement;

export interface FrameCacheOptions {
  /** URLs of all frames of the set (frame number = index). */
  urls: readonly string[];
  /** Frame numbers to keep (ascending); `items`/`loaded` are indexed by slot in this list. */
  plan: readonly number[];
  /** Frame numbers in download order (each in `plan`). */
  order: readonly number[];
  /** Decode at this size (ImageBitmap only); the frames' own size otherwise. */
  resize?: { w: number; h: number };
  workers: number;
  /** false → decoded `<img>` elements (the browser may evict them; desktop: 1280px bitmaps would cost ~400 MB). */
  bitmaps?: boolean;
  /** A frame can be drawn now. */
  onFrame: (frame: number, slot: number) => void;
  /** All of the plan went through (`done`, failed downloads skipped) or a decode failed and the cache stopped. */
  onEnd: (why: 'done' | 'memory', decoded: number) => void;
}

export interface FrameCache {
  items: (Drawable | null)[];
  loaded: boolean[];
  /** Frames that went through (decoded or skipped after a failed download). */
  settled: () => number;
  cancel: () => void;
}

const bitmapsOk = (): boolean =>
  typeof createImageBitmap === 'function' && typeof fetch === 'function';

export const startFrameCache = (o: FrameCacheOptions): FrameCache => {
  const slotOf = new Map(o.plan.map((f, j) => [f, j] as [number, number]));
  const items: (Drawable | null)[] = o.plan.map(() => null);
  const loaded = o.plan.map(() => false);
  const queue = o.order.filter((f) => slotOf.has(f));
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  let useBitmaps = o.bitmaps !== false && bitmapsOk();
  let gone = false;
  let stopped = false;
  let settled = 0;
  let decoded = 0;
  let started = 0;

  const decodeBitmap = async (url: string): Promise<Drawable> => {
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2 && !res; attempt++) {
      try {
        // low priority but the first (poster): fonts and API answers of the page go first on a slow network
        const r = await fetch(url, {
          ...(abort ? { signal: abort.signal } : {}),
          ...(started++ ? { priority: 'low' } : {}),
        } as RequestInit);
        if (r.ok) res = r;
      } catch (e) {
        if (gone) throw e;
      }
    }
    if (!res) throw new Error('download');
    const blob = await res.blob();
    try {
      return await (o.resize
        ? createImageBitmap(blob, {
            resizeWidth: o.resize.w,
            resizeHeight: o.resize.h,
            resizeQuality: 'medium',
          })
        : createImageBitmap(blob));
    } catch {
      throw new Error('decode');
    }
  };

  const decodeImage = (url: string): Promise<Drawable> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (img.decode)
          img.decode().then(
            () => resolve(img),
            () => resolve(img)
          );
        else resolve(img);
      };
      img.onerror = () => reject(new Error('download'));
      img.src = url;
    });

  const worker = async () => {
    while (!gone && !stopped && queue.length) {
      const f = queue.shift() as number;
      const slot = slotOf.get(f) as number;
      const viaBitmap = useBitmaps;
      try {
        const d = await (viaBitmap ? decodeBitmap(o.urls[f]) : decodeImage(o.urls[f]));
        if (gone) {
          if ('close' in d) d.close();
          return;
        }
        items[slot] = d;
        loaded[slot] = true;
        decoded++;
        settled++;
        o.onFrame(f, slot);
      } catch (e) {
        if (gone) return;
        if ((e as Error).message === 'decode' && !decoded && viaBitmap) {
          // not a single bitmap yet: the engine cannot decode these (format, options) — decoded <img> instead
          useBitmaps = false;
          queue.unshift(f);
          continue;
        }
        if ((e as Error).message === 'decode') {
          stopped = true;
          o.onEnd('memory', decoded);
          return;
        }
        settled++;
      }
    }
  };

  void Promise.all(Array.from({ length: Math.max(1, o.workers) }, worker)).then(() => {
    if (!gone && !stopped) o.onEnd('done', decoded);
  });

  return {
    items,
    loaded,
    settled: () => settled,
    cancel: () => {
      gone = true;
      abort?.abort();
      items.forEach((d, j) => {
        if (d && 'close' in d) d.close();
        else if (d) d.removeAttribute('src');
        items[j] = null;
        loaded[j] = false;
      });
    },
  };
};
