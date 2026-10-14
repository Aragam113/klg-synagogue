import { useCallback, useEffect, useRef, useState } from 'react';

import { assetUrl } from '@/config/demo';
import { reportLoad } from '@/scenes/preloader/load-gate';
import { Title } from '@/ui/kit';
import { motionAllowed, touchMode } from '@/ui/motion/engine';
import { useScrollProgress } from '@/ui/motion/hooks';
import { approach } from '@/ui/motion/touch-scroll';

import { type FrameCache, startFrameCache } from './frame-cache';
import {
  type Blend,
  blendCached,
  coverRect,
  frameIndex,
  keyFrames,
  type KeyLayers,
  keyStep,
  loadOrder,
  parseManifest,
  type ScrubManifest,
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

const DEFAULT_MANIFEST = assetUrl('/media/scrub/manifest.json');
const pad = (n: number) => String(n).padStart(2, '0');
/** Blend alpha is drawn in steps of 1/ALPHA_STEPS: a tiny `--p` change does not repaint the canvas. */
const ALPHA_STEPS = 32;
/** Touch: below this width/height the portrait set is used. */
const PORTRAIT_MAX = 0.9;
/** Touch: key frames of the set shown as crossfaded `<img>` layers (≈ one per 0.2 screen of scroll). */
const TOUCH_KEYS = 24;
/** Touch: the poster goes once every READY_STEP-th key is decoded. */
const READY_STEP = 8;
/** Desktop: the preloader waits for this many frames (the start of the scene). */
const DESK_CRITICAL = 24;
/** Desktop: the scroll stands still this long → the picture settles on a whole frame (SETTLE_K of the gap per 60 Hz frame). */
const REST_MS = 120;
const SETTLE_K = 0.16;
/** Desktop: the canvas backing store is at most this × the frame height (upscaling further only costs fill rate). */
const BACKING_MAX = 1.5;

type SetKind = 'touch' | 'light' | 'full';
const portraitNow = () => window.innerWidth / Math.max(1, window.innerHeight) < PORTRAIT_MAX;
const NO_LAYERS: KeyLayers = { on: -1, under: -1 };

/**
 * Pinned scroll scene: a sticky 100svh picture inside a (chapters + 1) × 100svh runway; the picture follows the scroll
 * progress `--p` (lerped on touch by the engine).
 * Touch (phones, tablets): TOUCH_KEYS key frames of the portrait set `manifest.touch` (406×720; landscape — the light
 * 16:9 set) as decoded `<img>` layers; the key for `--p` goes on top and fades in by a CSS animation (opacity only,
 * run by the compositor) over the one shown before — never more than two layers, nothing painted per scroll frame,
 * no canvas, ~28 MB decoded. The per-frame canvas scrub was not reliable on real phones: the main thread was ~90% busy
 * during flings (CPU ×6), fast flings crossfaded frames far apart into a double image, 181 MB of decoded frames.
 * Desktop: the full 1280px set as decoded `<img>` drawn on a canvas, position x = p·(N−1), the two frames around x
 * crossfaded by the fraction (blendCached), settling on a whole frame at rest.
 * Download order: the poster, then ever finer even passes (loadOrder) — the scene is usable at any moment; on touch
 * the poster covers it until every READY_STEP-th key is in. Progress goes to the preloader as `scene` (load-gate).
 * The engine pulls the page to a chapter stop once the scroll rests inside (`snap`, touch). Chapters enter/leave by
 * `--p` in CSS on desktop, by `data-current` + CSS transitions on touch. Reduced motion: static poster + ribbon.
 * Touch keys: container `.scrub__keys` with `data-frame` (frame on top), `data-under`, `data-frames`,
 * `data-switches`; each `<img>` `data-layer="on|under"`. Desktop canvas: `data-frame`, `data-pos`, `data-frames`,
 * `data-pair`, `data-blend`, `data-draws`. Root: `data-media="keys|images"`, `data-set="touch|light|full"`,
 * `data-pass="coarse"` once it plays on touch, `data-loaded="all"`, `data-cache="<in>/<plan>"`.
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
  const keysEl = useRef<HTMLDivElement>(null);
  const cache = useRef<FrameCache | null>(null);
  const plan = useRef<number[]>([]);
  const count = useRef(0);
  const progress = useRef(0);
  const drawnKey = useRef('');
  const draws = useRef(0);
  const layers = useRef<KeyLayers>(NO_LAYERS);
  const switches = useRef(0);
  const box = useRef({ w: 0, h: 0 });
  /** desktop: position on screen (frames of the set): follows the scroll, settles on one whole frame at rest */
  const shownX = useRef(-1);
  const movedAt = useRef(0);
  const stepAt = useRef(0);
  const settleRaf = useRef(0);
  const [m, setM] = useState<ScrubManifest | null>(null);
  const [kind, setKind] = useState<SetKind>('full');
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [active, setActive] = useState(0);
  const [touch, setTouch] = useState(false);
  const [portrait, setPortrait] = useState(true);
  /** touch: every READY_STEP-th key is decoded — the poster may go */
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [all, setAll] = useState(false);
  const n = chapters.length;
  const phone = motion && touch;

  /** Touch: the key for the scroll on top (fading in), the one shown so far right under it, the rest hidden. */
  const showKey = useCallback(() => {
    const fc = cache.current;
    const holder = keysEl.current;
    const list = plan.current;
    if (!fc || !holder || !list.length) return;
    const was = layers.current;
    const next = keyStep(was, frameIndex(progress.current, list.length), fc.loaded);
    if (next === was) return;
    const el = (j: number) => (j >= 0 ? fc.items[j] : null);
    if (was.under >= 0 && was.under !== next.under && was.under !== next.on) {
      const gone = el(was.under);
      if (gone) delete gone.dataset.layer;
    }
    const under = el(next.under);
    if (under) under.dataset.layer = 'under';
    const on = el(next.on);
    if (on) on.dataset.layer = 'on';
    layers.current = next;
    holder.dataset.frame = String(list[next.on]);
    holder.dataset.under = next.under >= 0 ? String(list[next.under]) : '';
    holder.dataset.switches = String(++switches.current);
  }, []);

  const paint = useCallback((x: number) => {
    const c = canvas.current;
    const fc = cache.current;
    const list = plan.current;
    if (!c || !fc || !list.length) return;
    let bl: Blend | null = blendCached(x, list, fc.loaded);
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
    const { w: cw, h: ch } = box.current;
    if (!cw || !ch || !ia.naturalHeight) return;
    const scale = Math.max(
      1,
      Math.min(Math.min(2, window.devicePixelRatio || 1), (BACKING_MAX * ia.naturalHeight) / ch)
    );
    const w = Math.round(cw * scale);
    const h = Math.round(ch * scale);
    // the same picture at the same size is already on the canvas: no repaint on every --p write
    const key = `${bl.a}:${bl.b}:${bl.alpha}`;
    if (key === drawnKey.current && c.width === w && c.height === h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return;
    const r = coverRect(ia.naturalWidth, ia.naturalHeight, w, h);
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
   * Touch: the key layers. Desktop: the position to paint — exactly the scroll's while it moves (the crossfade gives
   * the in-between frames); once the scroll rests REST_MS it eases onto the nearest whole frame (own rAF only then).
   */
  const draw = useCallback(() => {
    const fc = cache.current;
    if (!fc || !plan.current.length) return;
    if (keysEl.current) {
      showKey();
      return;
    }
    const now = performance.now();
    const xt = Math.min(1, Math.max(0, progress.current)) * (count.current - 1);
    const resting = now - movedAt.current > REST_MS;
    let target = xt;
    if (resting) {
      const bl = blendCached(xt, plan.current, fc.loaded);
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
  }, [paint, showKey]);

  useScrollProgress(root, {
    mode: 'pin',
    snap: phone ? n : undefined,
    onChange: (p) => {
      progress.current = p;
      movedAt.current = performance.now();
      if (motion) setActive(Math.min(n - 1, Math.floor(p * n)));
      draw();
    },
  });

  // Live or static follows the media queries (pointer / reduced motion) — the same ones the motion engine watches;
  // on touch the orientation picks the portrait or the landscape set.
  useEffect(() => {
    const sync = () => {
      setMotion(motionAllowed());
      setTouch(touchMode());
      setPortrait(portraitNow());
    };
    sync();
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

  // Desktop: the canvas box comes from a ResizeObserver — never read in the per-frame draw.
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
  }, [m, motion, phone, draw]);

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
      const main = await sub(manifestUrl);
      if (gone) return;
      if (!main) return fail();
      const url = want === 'touch' ? main.touch : want === 'light' ? main.light : undefined;
      const set = url ? await sub(url).catch(() => null) : null;
      if (gone) return;
      setKind(set ? want : 'full');
      setM(set ?? main);
    })().catch(fail);
    return () => {
      gone = true;
    };
  }, [manifestUrl, phone, portrait]);

  // The frames: touch — the key frames as <img> layers; desktop — every frame for the canvas.
  useEffect(() => {
    if (!m) return;
    if (!motion) {
      reportLoad('scene', 1);
      return;
    }
    const N = m.frames.length;
    const keys = phone;
    const frames = keys ? keyFrames(N, TOUCH_KEYS) : Array.from({ length: N }, (_, i) => i);
    plan.current = frames;
    count.current = N;
    drawnKey.current = '';
    layers.current = NO_LAYERS;
    readyRef.current = false;
    setReady(false);
    setAll(false);
    const el = root.current;
    const holder = keysEl.current;
    const critical = keys ? frames.length : Math.min(N, DESK_CRITICAL);
    const firstPass = new Set(frames.filter((_, j) => j % READY_STEP === 0));
    let firstLeft = firstPass.size;
    if (el) el.dataset.cache = `0/${frames.length}`;
    reportLoad('scene', 0);
    const start = keys
      ? frames[frameIndex(m.poster / Math.max(1, N - 1), frames.length)]
      : frameIndex(progress.current, N);
    const fc = startFrameCache({
      urls: m.frames,
      plan: frames,
      order: loadOrder(frames, start),
      workers: keys ? 4 : 6,
      onFrame: (f, slot) => {
        const done = fc.settled();
        if (el) el.dataset.cache = `${done}/${frames.length}`;
        reportLoad('scene', done / critical);
        const img = fc.items[slot];
        if (holder && img) {
          img.className = 'scrub__key';
          // decoded already: painted with the very frame it shows up in, never a blank or partial layer
          img.decoding = 'sync';
          img.alt = '';
          img.dataset.slot = String(slot);
          holder.appendChild(img);
        }
        if (firstPass.has(f)) firstLeft--;
        if (!readyRef.current && (firstLeft <= 0 || !keys)) {
          readyRef.current = true;
          setReady(true);
        }
        draw();
      },
      onEnd: () => {
        if (el) el.dataset.cache = `${fc.settled()}/${frames.length}`;
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
      holder?.replaceChildren();
      cancelAnimationFrame(settleRaf.current);
      shownX.current = -1;
      layers.current = NO_LAYERS;
      if (cache.current === fc) cache.current = null;
    };
  }, [m, kind, motion, phone, draw]);

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

  const poster = m ? m.frames[m.poster] : null;
  return (
    <div
      ref={root}
      className={`scrub ${motion ? 'scrub--live' : 'scrub--static'}`}
      style={{ ['--chapters' as string]: n }}
      data-active={active}
      data-media={motion && m ? (phone ? 'keys' : 'images') : undefined}
      data-set={motion && m ? kind : undefined}
      data-pass={phone && ready ? 'coarse' : undefined}
      data-loaded={all ? 'all' : undefined}
      aria-label={ariaLabel}
      role="region"
    >
      <div className="scrub__sticky">
        <div className="scrub__media">
          {phone && m ? (
            <div ref={keysEl} className="scrub__keys" data-frames={m.frames.length} aria-hidden />
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
