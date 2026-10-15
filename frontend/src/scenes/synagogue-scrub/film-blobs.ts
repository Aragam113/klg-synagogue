/**
 * Downloads the scene films whole (fetch → Blob → object URL) so that the `<video>` elements play from memory: a
 * mobile browser treats `preload="auto"` as a hint (often metadata only) and would fetch on the first play — the
 * delay the visitor saw after a scroll. Reports the downloaded share (`onProgress`, 0..1; the files count equally).
 * `cancel()` aborts the downloads and revokes the URLs.
 */
export interface FilmBlobs {
  done: Promise<string[]>;
  cancel: () => void;
}

export const loadFilmBlobs = (
  urls: readonly string[],
  onProgress: (f: number) => void
): FilmBlobs => {
  const abort = typeof AbortController === 'function' ? new AbortController() : null;
  const made: string[] = [];
  const got = urls.map(() => 0);
  const size = urls.map(() => 0);
  // the files are about the same size: each counts as an equal share
  const report = () =>
    onProgress(
      got.reduce((a, g, i) => a + (size[i] ? Math.min(1, g / size[i]) : 0), 0) / urls.length
    );
  const one = async (url: string, i: number): Promise<string> => {
    const r = await fetch(url, abort ? { signal: abort.signal } : undefined);
    if (!r.ok) throw new Error(`film ${r.status}`);
    size[i] = Number(r.headers.get('content-length')) || 1;
    const type = r.headers.get('content-type') || 'video/mp4';
    let blob: Blob;
    if (r.body && typeof r.body.getReader === 'function') {
      const reader = r.body.getReader();
      const parts: BlobPart[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got[i] += value.byteLength;
        report();
      }
      blob = new Blob(parts, { type });
    } else {
      blob = await r.blob();
      got[i] = size[i];
      report();
    }
    const u = URL.createObjectURL(blob);
    made.push(u);
    return u;
  };
  // one after the other: the forward film first (it is the one that plays first)
  const done = (async () => {
    const out: string[] = [];
    for (let i = 0; i < urls.length; i++) out.push(await one(urls[i], i));
    onProgress(1);
    return out;
  })();
  return {
    done,
    cancel: () => {
      abort?.abort();
      made.forEach((u) => URL.revokeObjectURL(u));
    },
  };
};
