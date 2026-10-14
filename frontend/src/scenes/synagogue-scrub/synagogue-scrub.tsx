import { useCallback, useEffect, useRef, useState } from 'react';

import { assetUrl } from '@/config/demo';
import { reportLoad } from '@/scenes/preloader/load-gate';
import { Title } from '@/ui/kit';
import { motionAllowed, touchMode } from '@/ui/motion/engine';
import { useScrollProgress } from '@/ui/motion/hooks';
import { approach } from '@/ui/motion/touch-scroll';

import { type Drawable, type FrameCache, startFrameCache } from './frame-cache';
import { SceneFilm } from './scene-film';
import {
  type Blend,
  blendCached,
  coverRect,
  frameIndex,
  keyFrames,
  loadOrder,
  parseManifest,
  type ScrubManifest,
  touchFrameCount,
} from './scrub-model';
import './styles';

export interface ScrubChapter {
  id: string;
  /** Big label over the chapter: year or «Сегодня». */
  label: string;
  title: string;
  italic?: string;
  text: string;
}

export interface SynagogueScrubProps {
  chapters: ScrubChapter[];
  /** manifest.json of the frames; frames resolve relative to its folder. */
  manifest?: string;
  /** Prefix of the corner attribution, e.g. «Кадры:». */
  creditsLabel?: string;
  /** Short one-line attribution (i18n) shown instead of the manifest's full credit; the full one is in CREDITS.md. */
  credit?: string;
  /** Accessible name of the scene. */
  ariaLabel?: string;
}

/** Touch: `frames` — the scroll scrubs decoded frames on a canvas (?s=1); `film` — chapters play a film (?s=2). */
export type TouchSceneMode = 'frames' | 'film';
/** Touch default: the film — measured smoother than the scrub (2026-10-15: video frame pacing CV 0.37 vs picture-step CV 0.5–2.0, no lag after a chapter change). */
export const DEFAULT_TOUCH_MODE: TouchSceneMode = 'film';
/** `?s=1` → frames, `?s=2` → film, else the default. */
export const touchSceneMode = (search: string): TouchSceneMode => {
  const s = /[?&]s=([12])(?:&|$)/.exec(search)?.[1];
  return s === '1' ? 'frames' : s === '2' ? 'film' : DEFAULT_TOUCH_MODE;
};

const DEFAULT_MANIFEST = assetUrl('/media/scrub/manifest.json');
const pad = (n: number) => String(n).padStart(2, '0');
/** Blend alpha is drawn in steps of 1/ALPHA_STEPS: a tiny `--p` change does not repaint the canvas. */
const ALPHA_STEPS = 32;
/** Touch: below this width/height the portrait set is used. */
const PORTRAIT_MAX = 0.9;
/** Touch frames: decoded at this height (540 px: 304×540 portrait, 960×540 landscape). */
const TOUCH_H = 540;
/** Touch frames: the poster goes once every READY_STEP-th frame of the plan is decoded. */
const READY_STEP = 8;
/** Desktop: the preloader waits for this many frames (the start of the scene). */
const DESK_CRITICAL = 24;
/** The scroll stands still this long → the picture settles on a whole frame (SETTLE_K of the gap per 60 Hz frame). */
const REST_MS = 120;
const SETTLE_K = 0.16;
/** The canvas backing store is at most this × the frame height (upscaling further only costs fill rate). */
const BACKING_MAX = 1.5;

type SetKind = 'touch' | 'light' | 'full';
type Mode = 'desk' | TouchSceneMode;
const portraitNow = () => window.innerWidth / Math.max(1, window.innerHeight) < PORTRAIT_MAX;
const sizeOf = (d: Drawable) =>
  'naturalWidth' in d ? { w: d.naturalWidth, h: d.naturalHeight } : { w: d.width, h: d.height };
const deviceMemory = (): number | undefined =>
  (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

/**
 * Pinned scroll scene: a sticky 100svh picture inside a (chapters + 1) × 100svh runway; the chapters and the picture
 * follow the scroll progress `--p` (scroll timeline `--pin` where supported, styles/scroll-timelines.css).
 * Desktop: the full 1280px set as decoded `<img>` on a canvas, position x = p·(N−1), the two frames around x
 * crossfaded by the fraction (blendCached), settling on a whole frame at rest.
 * Touch has two modes (`?s=1` / `?s=2`, default DEFAULT_TOUCH_MODE):
 *  - frames: the same canvas scrub, but from touchFrameCount frames (120 / 80 / 54 by memory) of the portrait set
 *    (landscape — the light 16:9 set) decoded off the main thread into ImageBitmaps at 540 px height (≤ 79 MB);
 *    only neighbouring frames are crossfaded; a repaint only when (a, b, alpha/32) changes; the canvas is its own
 *    layer. Loading: the poster, then every 8th frame, then ever finer passes (loadOrder) — usable at any moment.
 *  - film: crossing into a chapter plays the H.264 film to that chapter's hold in real time, back up — the reversed
 *    file (SceneFilm); the chapter text follows the chapter by transitions. A refused play() falls back to frames.
 * The engine pulls the page to a chapter stop once the scroll rests inside (`snap`, touch). Reduced motion: static
 * poster + ribbon.
 * Canvas: `data-frame`, `data-pos`, `data-frames`, `data-pair`, `data-blend`, `data-draws`. Root: `data-mode`
 * (desk|frames|film), `data-media` (images|bitmaps|film), `data-set`, `data-pass="coarse"` once it plays on touch,
 * `data-loaded="all"`, `data-cache="<in>/<plan>"`, `data-cache-stop="memory"`.
 */
export const SynagogueScrub = ({
  chapters,
  manifest: manifestUrl = DEFAULT_MANIFEST,
  creditsLabel = '',
  credit,
  ariaLabel,
}: SynagogueScrubProps) => {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cache = useRef<FrameCache | null>(null);
  const plan = useRef<number[]>([]);
  const gap = useRef<number | undefined>(undefined);
  const count = useRef(0);
  const progress = useRef(0);
  const drawnKey = useRef('');
  const draws = useRef(0);
  const box = useRef({ w: 0, h: 0 });
  /** position on screen (frames of the set): follows the scroll, settles on one whole frame at rest */
  const shownX = useRef(-1);
  const movedAt = useRef(0);
  const stepAt = useRef(0);
  const settleRaf = useRef(0);
  const [main, setMain] = useState<ScrubManifest | null>(null);
  const [m, setM] = useState<ScrubManifest | null>(null);
  const [kind, setKind] = useState<SetKind>('full');
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [active, setActive] = useState(0);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(true);
  const [touchPick, setTouchPick] = useState<TouchSceneMode>(DEFAULT_TOUCH_MODE);
  /** touch: something to show — the poster may go */
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [all, setAll] = useState(false);
  const n = chapters.length;
  const phone = motion && touch;
  const mode: Mode = !phone ? 'desk' : touchPick === 'film' && main?.film ? 'film' : 'frames';

  const paint = useCallback((x: number) => {
    const c = canvas.current;
    const fc = cache.current;
    const list = plan.current;
    if (!c || !fc || !list.length) return;
    let bl: Blend | null = blendCached(x, list, fc.loaded, gap.current);
    if (!bl) return;
    if (bl.alpha > 0) {
      const q = Math.round(bl.alpha * ALPHA_STEPS) / ALPHA_STEPS;
      bl =
        q <= 0
          ? { a: bl.a, b: bl.a, alpha: 0 }
          : q >= 1
            ? { a: bl.b, b: bl.b, alpha: 0 }
            : { ...bl, alpha: q };
    }
    const ia = fc.items[list.indexOf(bl.a)];
    const ib = fc.items[list.indexOf(bl.b)];
    if (!ia || !ib) return;
    const src = sizeOf(ia);
    const { w: cw, h: ch } = box.current;
    if (!cw || !ch || !src.h) return;
    const scale = Math.max(
      1,
      Math.min(Math.min(2, window.devicePixelRatio || 1), (BACKING_MAX * src.h) / ch)
    );
    const w = Math.round(cw * scale);
    const h = Math.round(ch * scale);
    // the same picture at the same size is already on the canvas: no repaint on every --p change
    const key = `${bl.a}:${bl.b}:${bl.alpha}`;
    if (key === drawnKey.current && c.width === w && c.height === h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return;
    const r = coverRect(src.w, src.h, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(ia, r.x, r.y, r.w, r.h);
    if (bl.alpha > 0) {
      ctx.globalAlpha = bl.alpha;
      ctx.drawImage(ib, r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    drawnKey.current = key;
    c.dataset.frame = String(bl.alpha < 0.5 ? bl.a : bl.b);
    c.dataset.pos = (bl.a + bl.alpha * (bl.b - bl.a)).toFixed(2);
    c.dataset.blend = String(bl.alpha);
    c.dataset.pair = `${bl.a}-${bl.b}`;
    c.dataset.draws = String(++draws.current);
  }, []);

  /**
   * The position to paint: exactly the scroll's while it moves (the crossfade gives the in-between frames); once the
   * scroll rests REST_MS it eases onto the nearest whole decoded frame — a crossfade standing still reads as a
   * double image. Its own rAF runs only for that settle.
   */
  const draw = useCallback(() => {
    const fc = cache.current;
    if (!fc || !plan.current.length) return;
    const now = performance.now();
    const xt = Math.min(1, Math.max(0, progress.current)) * (count.current - 1);
    const resting = now - movedAt.current > REST_MS;
    let target = xt;
    if (resting) {
      const bl = blendCached(xt, plan.current, fc.loaded, gap.current);
      if (bl) target = bl.alpha < 0.5 ? bl.a : bl.b;
    }
    const dt = Math.min(100, now - stepAt.current);
    stepAt.current = now;
    const cur = shownX.current < 0 ? target : shownX.current;
    shownX.current = resting ? approach(cur, target, SETTLE_K, dt) : target;
    if (Math.abs(shownX.current - target) < 0.02) shownX.current = target;
    paint(shownX.current);
    cancelAnimationFrame(settleRaf.current);
    if (!resting || shownX.current !== target) settleRaf.current = requestAnimationFrame(draw);
  }, [paint]);

  useScrollProgress(root, {
    mode: 'pin',
    timeline: true,
    snap: phone ? n : undefined,
    onChange: (p) => {
      progress.current = p;
      movedAt.current = performance.now();
      if (motion) setActive(Math.min(n - 1, Math.floor(p * n)));
      draw();
    },
  });

  // Live or static follows the media queries (pointer / reduced motion) — the same ones the motion engine watches;
  // on touch the orientation picks the portrait or the landscape set, the URL the mode.
  useEffect(() => {
    const sync = () => {
      setMotion(motionAllowed());
      setTouch(touchMode());
      setPortrait(portraitNow());
    };
    sync();
    setTouchPick(touchSceneMode(window.location.search));
    const mqs = ['(pointer: coarse)', '(prefers-reduced-motion: reduce)'].map((q) =>
      window.matchMedia(q)
    );
    mqs.forEach((q) => q.addEventListener('change', sync));
    window.addEventListener('resize', sync);
    return () => {
      mqs.forEach((q) => q.removeEventListener('change', sync));
      window.removeEventListener('resize', sync);
    };
  }, []);

  // The canvas box comes from a ResizeObserver — never read in the per-frame draw (no forced layout).
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      box.current = { w: c.clientWidth, h: c.clientHeight };
      drawnKey.current = '';
      draw();
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [m, motion, mode, draw]);

  // The manifest: the main one, then (touch) the portrait or the landscape set.
  useEffect(() => {
    let gone = false;
    const want: SetKind = !phone ? 'full' : portrait ? 'touch' : 'light';
    const sub = async (url: string): Promise<ScrubManifest | null> => {
      const r = await fetch(url);
      if (!r.ok) return null;
      return parseManifest(await r.json(), url.slice(0, url.lastIndexOf('/') + 1));
    };
    const fail = () => {
      if (gone) return;
      reportLoad('scene', 1);
      setFailed(true);
    };
    (async () => {
      const top = await sub(manifestUrl);
      if (gone) return;
      if (!top) return fail();
      const url = want === 'touch' ? top.touch : want === 'light' ? top.light : undefined;
      const set = url ? await sub(url).catch(() => null) : null;
      if (gone) return;
      setMain(top);
      setKind(set ? want : 'full');
      setM(set ?? top);
    })().catch(fail);
    return () => {
      gone = true;
    };
  }, [manifestUrl, phone, portrait]);

  // The frame cache (desk, frames): the plan, the load order, progress to the preloader.
  useEffect(() => {
    if (!m) return;
    if (!motion) {
      reportLoad('scene', 1);
      return;
    }
    if (mode === 'film') return;
    const N = m.frames.length;
    const bitmaps = mode === 'frames';
    const frames = bitmaps
      ? keyFrames(N, touchFrameCount(deviceMemory()))
      : Array.from({ length: N }, (_, i) => i);
    const resize = bitmaps
      ? { w: Math.round((TOUCH_H * m.width) / m.height), h: Math.min(TOUCH_H, m.height) }
      : undefined;
    plan.current = frames;
    count.current = N;
    // phones: while the rest loads, frames two plan steps apart crossfade too; neighbours only once all are in
    gap.current = bitmaps ? Math.ceil((2 * (N - 1)) / Math.max(1, frames.length - 1)) : undefined;
    drawnKey.current = '';
    readyRef.current = false;
    setReady(false);
    setAll(false);
    const el = root.current;
    const critical = bitmaps ? frames.length : Math.min(N, DESK_CRITICAL);
    const firstPass = new Set(frames.filter((_, j) => j % READY_STEP === 0));
    let firstLeft = firstPass.size;
    if (el) {
      el.dataset.cache = `0/${frames.length}`;
      delete el.dataset.cacheStop;
    }
    reportLoad('scene', 0);
    const fc = startFrameCache({
      urls: m.frames,
      plan: frames,
      order: loadOrder(
        frames,
        bitmaps
          ? frames[frameIndex(m.poster / Math.max(1, N - 1), frames.length)]
          : frameIndex(progress.current, N)
      ),
      resize,
      bitmaps,
      workers: bitmaps ? 4 : 6,
      onFrame: (f) => {
        const done = fc.settled();
        if (el) el.dataset.cache = `${done}/${frames.length}`;
        reportLoad('scene', done / critical);
        if (firstPass.has(f)) firstLeft--;
        if (!readyRef.current && (firstLeft <= 0 || !bitmaps)) {
          readyRef.current = true;
          setReady(true);
        }
        draw();
      },
      onEnd: (why) => {
        if (el) {
          el.dataset.cache = `${fc.settled()}/${frames.length}`;
          if (why === 'memory') el.dataset.cacheStop = 'memory';
        }
        // all in: neighbours only
        if (bitmaps) gap.current = undefined;
        reportLoad('scene', 1);
        readyRef.current = true;
        setReady(true);
        setAll(true);
        draw();
      },
    });
    cache.current = fc;
    return () => {
      fc.cancel();
      cancelAnimationFrame(settleRaf.current);
      shownX.current = -1;
      if (cache.current === fc) cache.current = null;
    };
  }, [m, kind, motion, mode, draw]);

  // Film: the preloader waits only for its first frame.
  useEffect(() => {
    if (mode !== 'film') return;
    readyRef.current = false;
    setReady(false);
    setAll(false);
    reportLoad('scene', 0);
  }, [mode]);
  const onFilmReady = useCallback(() => {
    reportLoad('scene', 1);
    readyRef.current = true;
    setReady(true);
    setAll(true);
  }, []);
  const onFilmFail = useCallback(() => setTouchPick('frames'), []);

  // Touch / reduced motion: the chapters are a swipe ribbon (scroll-snap) and the dots follow it.
  const ribbon = useRef<HTMLOListElement>(null);
  const onRibbon = () => {
    const el = ribbon.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.max(0, Math.min(n - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth))));
  };
  const goTo = (i: number) => {
    const el = ribbon.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: rtl * i * el.clientWidth, behavior: 'smooth' });
  };

  const poster = m ? m.frames[mode === 'film' ? 0 : m.poster] : null;
  const film = mode === 'film' ? main?.film : undefined;
  return (
    <div
      ref={root}
      className={`scrub ${motion ? 'scrub--live' : 'scrub--static'}`}
      style={{ ['--chapters' as string]: n }}
      data-active={active}
      data-mode={motion && m ? mode : undefined}
      data-media={
        motion && m
          ? mode === 'film'
            ? 'film'
            : mode === 'frames'
              ? 'bitmaps'
              : 'images'
          : undefined
      }
      data-set={motion && m ? kind : undefined}
      data-pass={phone && ready ? 'coarse' : undefined}
      data-loaded={all ? 'all' : undefined}
      aria-label={ariaLabel}
      role="region"
    >
      <div className="scrub__sticky">
        <div className="scrub__media">
          {film && m ? (
            <SceneFilm
              src={portrait ? film.p : film.l}
              rev={portrait ? film.pr : film.lr}
              duration={film.duration}
              holds={film.holds}
              chapter={active}
              poster={poster ?? undefined}
              onReady={onFilmReady}
              onFail={onFilmFail}
            />
          ) : motion && m ? (
            <canvas
              ref={canvas}
              className="scrub__canvas"
              data-frames={m.frames.length}
              aria-hidden
            />
          ) : poster ? (
            <img className="scrub__poster" src={poster} alt="" />
          ) : null}
          {phone && !ready && poster ? (
            <img className="scrub__poster" src={poster} alt="" data-waiting="" />
          ) : null}
          {failed ? <div className="scrub__fallback" aria-hidden /> : null}
          <div className="scrub__shade" aria-hidden />
        </div>
        <div className="scrub__progress" aria-hidden />
        <div className="scrub__counter" aria-hidden>
          <span className="drum">
            <span className="drum__reel" style={{ transform: `translateY(${-1.2 * active}em)` }}>
              {chapters.map((c) => (
                <span key={c.id}>{pad(chapters.indexOf(c) + 1)}</span>
              ))}
            </span>
          </span>
          <span className="scrub__total">/ {pad(n)}</span>
        </div>
        {!motion && n > 1 ? (
          <div className="scrub__dots pinned__dots">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="pinned__dot"
                aria-label={c.label}
                aria-current={i === active}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        ) : null}
        <ol
          className="scrub__chapters"
          ref={ribbon}
          data-ribbon={motion ? undefined : ''}
          onScroll={motion ? undefined : onRibbon}
        >
          {chapters.map((c, i) => (
            <li
              key={c.id}
              className="scrub__chapter"
              data-current={i === active}
              style={{ ['--i' as string]: i }}
            >
              <span className="scrub__year">{c.label}</span>
              <Title as="h3" size="lg" text={c.title} italicWord={c.italic} />
              <p className="scrub__text">{c.text}</p>
            </li>
          ))}
        </ol>
        {credit || m?.credits ? (
          <p className="scrub__credits">
            {credit ?? `${creditsLabel ? `${creditsLabel} ` : ''}${m?.credits}`}
          </p>
        ) : null}
      </div>
    </div>
  );
};
