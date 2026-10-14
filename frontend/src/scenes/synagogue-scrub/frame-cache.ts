/**
 * Downloads frames of the scroll scene and keeps them DECODED as `<img>` elements (`img.decode()` before a frame
 * counts as in): a frame is never shown half-downloaded or decoded on the main thread at the moment it appears.
 * Frames come in `order` with `workers` downloads at a time; each one is reported through `onFrame` once it can be
 * shown. A failed download is skipped. `cancel()` stops the queue and drops the images.
 */
export interface FrameCacheOptions {
  /** URLs of all frames of the set (frame number = index). */
  urls: readonly string[];
  /** Frame numbers to keep (ascending); `items`/`loaded` are indexed by slot in this list. */
  plan: readonly number[];
  /** Frame numbers in download order (each in `plan`). */
  order: readonly number[];
  workers: number;
  /** A frame can be shown now. */
  onFrame: (frame: number, slot: number) => void;
  /** All of the plan went through (failed downloads skipped). */
  onEnd: (decoded: number) => void;
}

export interface FrameCache {
  items: (HTMLImageElement | null)[];
  loaded: boolean[];
  /** Frames that went through (decoded or skipped after a failed download). */
  settled: () => number;
  cancel: () => void;
}

const decodeImage = (url: string, first: boolean): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    // low priority but the first (poster): fonts and API answers of the page go first on a slow network
    if (!first) (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'low';
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

export const startFrameCache = (o: FrameCacheOptions): FrameCache => {
  const slotOf = new Map(o.plan.map((f, j) => [f, j] as [number, number]));
  const items: (HTMLImageElement | null)[] = o.plan.map(() => null);
  const loaded = o.plan.map(() => false);
  const queue = o.order.filter((f) => slotOf.has(f));
  let gone = false;
  let settled = 0;
  let decoded = 0;
  let started = 0;

  const worker = async () => {
    while (!gone && queue.length) {
      const f = queue.shift() as number;
      const slot = slotOf.get(f) as number;
      try {
        const img = await decodeImage(o.urls[f], !started++);
        if (gone) return;
        items[slot] = img;
        loaded[slot] = true;
        decoded++;
        settled++;
        o.onFrame(f, slot);
      } catch {
        if (gone) return;
        settled++;
      }
    }
  };

  void Promise.all(Array.from({ length: Math.max(1, o.workers) }, worker)).then(() => {
    if (!gone) o.onEnd(decoded);
  });

  return {
    items,
    loaded,
    settled: () => settled,
    cancel: () => {
      gone = true;
      items.forEach((d, j) => {
        d?.removeAttribute('src');
        items[j] = null;
        loaded[j] = false;
      });
    },
  };
};
