/**
 * Touch-only behaviour of the scroll engine, switchable by `?a=1|2|3` (remembered for the tab in sessionStorage):
 *   1 «own smooth scroll» — Lenis with syncTouch, `--p` from Lenis' virtual position every rAF;
 *   2 «poll + smooth»    — native scroll, scrollY read every rAF, `--p` eases to the target (lerp .18);
 *                          the scene uses the light 640px frame set, poster until it is loaded;
 *   3 «by time»          — no scroll link: a section entering the screen plays its `--p` by itself.
 * In all three the sticky runways use a px viewport height fixed at start (changes only with orientation).
 * The desktop (fine pointer) never reads this.
 */
export type TouchVariant = 1 | 2 | 3;

/** Picked by the phone bench (e2e/mscroll-bench.mjs): see the table in the task report. */
export const DEFAULT_TOUCH_VARIANT: TouchVariant = 2;

/** sessionStorage key: the choice survives navigation inside the SPA (links drop the query). */
export const TOUCH_VARIANT_KEY = 'synagogue.touchVariant';

const asVariant = (v: string | null | undefined): TouchVariant | null =>
  v === '1' || v === '2' || v === '3' ? (Number(v) as TouchVariant) : null;

/** `?a=` wins, then the remembered value, then the default. */
export const parseTouchVariant = (search: string, stored: string | null): TouchVariant => {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('a');
  return asVariant(q) ?? asVariant(stored) ?? DEFAULT_TOUCH_VARIANT;
};

/** Frame-rate independent lerp: `k` is the share of the gap closed per 60 Hz frame; snaps within 5e-4. */
export const approach = (cur: number, target: number, k: number, dtMs: number): number => {
  const step = 1 - Math.pow(1 - k, Math.max(0, dtMs) / (1000 / 60));
  const next = cur + (target - cur) * step;
  return Math.abs(target - next) < 5e-4 ? target : next;
};

/** Progress by time: ease-out (cubic) from `from` to `to` over `durMs`, then holds `to`. */
export const timedProgress = (
  elapsedMs: number,
  durMs: number,
  from: number,
  to: number
): number => {
  const t = Math.min(1, Math.max(0, elapsedMs / Math.max(1, durMs)));
  return from + (to - from) * (1 - Math.pow(1 - t, 3));
};
