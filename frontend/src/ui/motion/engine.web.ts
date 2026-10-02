import Lenis from 'lenis';

import type { MotionEl, ProgressMode, RegisterOptions } from './engine';
import { progressOf } from './progress';
import {
  approach,
  parseTouchVariant,
  timedProgress,
  TOUCH_VARIANT_KEY,
  type TouchVariant,
} from './touch-variant';

/**
 * Web scroll engine. ONE rAF writes `--p` (0..1, toFixed(4), change threshold 4e-4) into registered elements;
 * every frame reads all rects first and writes after (no read/write interleaving → no forced layouts).
 * Fine pointer: Lenis (lerp .1) driven by a continuous rAF loop — the desktop path.
 * Touch (`html[data-touch]`, switchable by `?a=1|2|3`, see touch-variant.ts):
 *   1 — Lenis with syncTouch, continuous rAF, `--p` from Lenis' virtual (smoothed) position;
 *   2 — native scroll, scrollY polled every rAF (no reliance on throttled scroll events), `--p` eases to it;
 *   3 — no scroll link: an element entering the screen plays its `--p` by time (`duration`, `waitFor`).
 * On touch the viewport height is fixed in px at start (`--vh-fix` on <html>, used by the sticky runways and by
 * the progress maths) and re-read only when the width changes (orientation) — not when the address bar moves.
 * IntersectionObserver switches far-away elements off and sets one-shot `data-revealed`.
 * `html[data-motion]` (scroll-driven `--p` CSS, the scroll scene) and `html[data-anim]` (Reveal, marquee, hero
 * entrance, idle turns) are "on" whenever reduced motion is off, touch included. `html[data-pin]` gates the pinned
 * chapters (`<Pinned>`) and is "on" only for a fine pointer: on a phone they stay a swipe ribbon.
 * All "off" (reduced motion) = everything static and visible.
 */
interface Entry {
  el: MotionEl;
  mode: ProgressMode;
  active: boolean;
  /** last written value (threshold) */
  last: number;
  /** variant 2: smoothed value (-1 = snap on the next frame) */
  cur: number;
  /** variant 3 */
  visible: boolean;
  elapsed: number;
  duration: number;
  waitFor?: () => boolean;
  onChange?: (p: number) => void;
}

const LERP = 0.18;
const DEFAULT_DURATION = 2600;
/** variant 3: where a time-played element starts and stops ('through' at .72 has every reveal/stroke done). */
const TIMED_RANGE: Record<ProgressMode, [number, number]> = { pin: [0, 1], through: [0.15, 0.72] };

const entries = new Map<Element, Entry>();
let lenis: Lenis | null = null;
let lenisKind: 'desk' | 'touch' | null = null;
let raf = 0;
let lastT = 0;
let users = 0;
let variant: 0 | TouchVariant = 0;
let vhFix = 0;
let vhW = 0;
let activeIO: IntersectionObserver | null = null;
let revealIO: IntersectionObserver | null = null;
let timeIO: IntersectionObserver | null = null;
let layoutRO: ResizeObserver | null = null;
const mqs: MediaQueryList[] = [];

export { progressOf } from './progress';

/** The visitor asked the OS for reduced motion (one-off animations such as the preloader check only this). */
export const reducedMotion = (): boolean =>
  typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll-driven motion (`--p`, scroll scene): everywhere, touch included, unless reduced motion. */
export const motionAllowed = (): boolean => !reducedMotion();

/** Pinned chapters + smooth (Lenis) scroll: fine pointer and no reduced motion. */
export const pinAllowed = (): boolean =>
  !reducedMotion() && !window.matchMedia('(pointer: coarse)').matches;

/** Active touch variant, 0 on a fine pointer / reduced motion (read directly when the engine is not started yet). */
export const touchVariant = (): 0 | TouchVariant =>
  users ? variant : !pinAllowed() && !reducedMotion() ? readVariant() : 0;

const readVariant = (): TouchVariant => {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(TOUCH_VARIANT_KEY);
  } catch {
    /* storage blocked */
  }
  const v = parseTouchVariant(window.location.search, stored);
  if (/[?&]a=[123](&|$)/.test(window.location.search))
    try {
      sessionStorage.setItem(TOUCH_VARIANT_KEY, String(v));
    } catch {
      /* storage blocked */
    }
  return v;
};

const fixViewport = () => {
  vhFix = window.innerHeight;
  vhW = window.innerWidth;
  document.documentElement.style.setProperty('--vh-fix', `${vhFix}px`);
};

const set = (e: Entry, p: number) => {
  if (Math.abs(p - e.last) > 4e-4 || (p !== e.last && (p === 0 || p === 1))) {
    e.last = p;
    e.el.style.setProperty('--p', p.toFixed(4));
    e.onChange?.(p);
  }
};

const playing = (e: Entry) => e.visible && e.elapsed < e.duration;

const writeAll = (dt: number) => {
  if (variant === 3) {
    entries.forEach((e) => {
      if (!playing(e) || (e.waitFor && !e.waitFor())) return;
      e.elapsed += dt;
      const [from, to] = TIMED_RANGE[e.mode];
      set(e, timedProgress(e.elapsed, e.duration, from, to));
    });
    return;
  }
  const vh = variant ? vhFix : window.innerHeight;
  const todo: [Entry, number][] = [];
  entries.forEach((e) => {
    if (e.active) todo.push([e, progressOf(e.el.getBoundingClientRect(), vh, e.mode)]);
  });
  for (const [e, p] of todo) {
    if (variant !== 2) set(e, p);
    else {
      e.cur = e.cur < 0 ? p : approach(e.cur, p, LERP, dt);
      set(e, e.cur);
    }
  }
};

const needLoop = (): boolean => {
  if (lenis || variant === 2) return true;
  if (variant !== 3) return false;
  for (const e of entries.values()) if (playing(e)) return true;
  return false;
};

const tick = (t: number) => {
  const dt = lastT ? Math.min(100, t - lastT) : 1000 / 60;
  lastT = t;
  lenis?.raf(t);
  writeAll(dt);
  if (needLoop()) raf = requestAnimationFrame(tick);
  else {
    raf = 0;
    lastT = 0;
  }
};

/** Starts a frame (a single one when nothing needs the continuous loop). */
const schedule = () => {
  if (raf || !users) return;
  raf = requestAnimationFrame(tick);
};

const onResize = () => {
  // orientation (width) change: new fixed height; the address bar (height only) is ignored
  if (variant && window.innerWidth !== vhW) fixViewport();
  schedule();
};

const revealAll = () =>
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.dataset.revealed = 'true';
  });

const makeLenis = (kind: 'desk' | 'touch'): Lenis =>
  kind === 'desk'
    ? new Lenis({ lerp: 0.1, autoRaf: false, smoothWheel: true, wheelMultiplier: 1 })
    : new Lenis({
        autoRaf: false,
        smoothWheel: false,
        syncTouch: true,
        syncTouchLerp: 0.09,
        touchInertiaExponent: 1.7,
        allowNestedScroll: true,
        // horizontal ribbons (community chapters, scene ribbon) keep their native swipe
        prevent: (node) => !!node.closest?.('[data-ribbon],[data-lenis-prevent]'),
      });

const applyMode = () => {
  const html = document.documentElement;
  const pin = pinAllowed();
  const anim = !reducedMotion();
  html.dataset.motion = motionAllowed() ? 'on' : 'off';
  html.dataset.pin = pin ? 'on' : 'off';
  // Cheap time/reveal animations (marquee, Reveal, hero words) also run on touch; only reduced motion stops them.
  html.dataset.anim = anim ? 'on' : 'off';
  const before = variant;
  variant = !pin && anim ? readVariant() : 0;
  if (variant) {
    html.dataset.touch = String(variant);
    fixViewport();
  } else delete html.dataset.touch;
  if (before !== variant) entries.forEach((e) => (e.cur = -1));
  const kind = pin ? 'desk' : variant === 1 ? 'touch' : null;
  if (kind !== lenisKind) {
    lenis?.destroy();
    lenis = kind ? makeLenis(kind) : null;
    lenisKind = kind;
  }
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastT = 0;
  schedule();
  if (!anim) revealAll();
};

export const startEngine = (): void => {
  if (typeof window === 'undefined' || users++ > 0) return;
  activeIO = new IntersectionObserver(
    (list) => {
      list.forEach((x) => {
        const e = entries.get(x.target);
        if (!e) return;
        if (x.isIntersecting && !e.active) e.cur = -1;
        e.active = x.isIntersecting;
      });
      schedule();
    },
    { rootMargin: '100% 0px 100% 0px' }
  );
  revealIO = new IntersectionObserver(
    (list) =>
      list.forEach((x) => {
        if (!x.isIntersecting) return;
        (x.target as HTMLElement).dataset.revealed = 'true';
        revealIO?.unobserve(x.target);
      }),
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
  );
  // variant 3: plays while on screen (a pinned scene — once half of it is in), pauses off screen
  timeIO = new IntersectionObserver(
    (list) => {
      list.forEach((x) => {
        const e = entries.get(x.target);
        if (!e) return;
        e.visible =
          e.mode === 'pin'
            ? x.isIntersecting && x.intersectionRect.height >= window.innerHeight * 0.5
            : x.isIntersecting;
      });
      schedule();
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px 0px -12% 0px' }
  );
  entries.forEach((e) => {
    activeIO?.observe(e.el);
    timeIO?.observe(e.el);
  });
  document
    .querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
    .forEach((el) => revealIO?.observe(el));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  // content arriving later (API data, images) moves sections without any scroll event
  if (typeof ResizeObserver !== 'undefined') {
    layoutRO = new ResizeObserver(schedule);
    layoutRO.observe(document.body);
  }
  applyMode();
  if (variant === 3) entries.forEach((e) => set(e, TIMED_RANGE[e.mode][0]));
  for (const q of ['(pointer: coarse)', '(prefers-reduced-motion: reduce)']) {
    const mq = window.matchMedia(q);
    mq.addEventListener('change', applyMode);
    mqs.push(mq);
  }
};

export const stopEngine = (): void => {
  if (--users > 0) return;
  cancelAnimationFrame(raf);
  raf = 0;
  lastT = 0;
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', onResize);
  layoutRO?.disconnect();
  layoutRO = null;
  activeIO?.disconnect();
  revealIO?.disconnect();
  timeIO?.disconnect();
  activeIO = null;
  revealIO = null;
  timeIO = null;
  mqs.splice(0).forEach((mq) => mq.removeEventListener('change', applyMode));
  lenis?.destroy();
  lenis = null;
  lenisKind = null;
};

export const registerProgress = (el: MotionEl, opts: RegisterOptions = {}): (() => void) => {
  const e: Entry = {
    el,
    mode: opts.mode ?? 'through',
    active: true,
    last: -1,
    cur: -1,
    visible: false,
    elapsed: 0,
    duration: opts.duration ?? DEFAULT_DURATION,
    waitFor: opts.waitFor,
    onChange: opts.onChange,
  };
  entries.set(el, e);
  activeIO?.observe(el);
  timeIO?.observe(el);
  if (variant === 3) set(e, TIMED_RANGE[e.mode][0]);
  else set(e, progressOf(el.getBoundingClientRect(), variant ? vhFix : window.innerHeight, e.mode));
  return () => {
    entries.delete(el);
    activeIO?.unobserve(el);
    timeIO?.unobserve(el);
  };
};

export const registerReveal = (el: MotionEl): (() => void) => {
  el.dataset.reveal = '';
  // Before startEngine (child effects run before the provider's) the element is picked up by startEngine itself.
  if (!revealIO) return () => undefined;
  if (document.documentElement.dataset.anim !== 'on') el.dataset.revealed = 'true';
  else revealIO.observe(el);
  return () => revealIO?.unobserve(el);
};

export const scrollToTop = (): void => {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
};

/** Locks page scroll (full-screen menu). */
export const lockScroll = (locked: boolean): void => {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
};
