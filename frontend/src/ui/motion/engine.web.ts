import Lenis from 'lenis';

import type { MotionEl, ProgressMode, RegisterOptions } from './engine';
import { progressOf } from './progress';
import {
  approach,
  easeKit,
  sceneSnapPoints,
  snapDuration,
  snapTarget,
  TOUCH_LERP,
} from './touch-scroll';

/**
 * Web scroll engine. ONE rAF writes `--p` (0..1, toFixed(4), change threshold 4e-4, touch 2e-4) into registered elements;
 * every frame reads all rects first and writes after (no read/write interleaving → no forced layouts).
 * Fine pointer: Lenis (lerp .1) driven by a continuous rAF loop — the desktop path.
 * Touch (`html[data-touch]`): native scroll, scrollY polled every rAF (no reliance on throttled scroll events),
 * `--p` eases to it (TOUCH_LERP). Elements registered with `snap` (a pinned scene) pull the page to a chapter
 * stop once the finger is up and the page has stood still SNAP_IDLE ms — once per rest, along the last movement
 * (≥ 30% of a chapter on, else back, never more than 0.3 screen against it), not at the entry/exit of the scene:
 * an animated scroll with the kit easing, 300..700 ms; any touch, wheel, key or foreign scroll cancels it at once;
 * an address-bar resize does not (touch-scroll.ts).
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
  /** touch: smoothed value (-1 = snap on the next frame) */
  cur: number;
  /** touch: chapters of a pinned scene that pulls the page to its stops */
  snap?: number;
  onChange?: (p: number) => void;
}

/** Touch: ms of stillness (finger up, inertia over) before the page glides to a stop. */
const SNAP_IDLE = 150;
/** Touch: px of travel that set the direction of the last movement (address-bar / rounding jitter is not one). */
const DIR_PX = 8;

const entries = new Map<Element, Entry>();
let lenis: Lenis | null = null;
let raf = 0;
let lastT = 0;
let users = 0;
let touch = false;
let vhFix = 0;
let vhW = 0;
let activeIO: IntersectionObserver | null = null;
let revealIO: IntersectionObserver | null = null;
let layoutRO: ResizeObserver | null = null;
const mqs: MediaQueryList[] = [];
/** touch: scroll state polled every rAF */
const tp = {
  y: -1,
  anchor: -1,
  movedAt: 0,
  dir: 0 as -1 | 0 | 1,
  finger: false,
  settled: false,
  resizedAt: -1e9,
};
/** touch: the running glide */
let glide: { from: number; to: number; start: number; dur: number; set: number } | null = null;

export { progressOf } from './progress';

/** The visitor asked the OS for reduced motion (one-off animations such as the preloader check only this). */
export const reducedMotion = (): boolean =>
  typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll-driven motion (`--p`, scroll scene): everywhere, touch included, unless reduced motion. */
export const motionAllowed = (): boolean => !reducedMotion();

/** Pinned chapters + smooth (Lenis) scroll: fine pointer and no reduced motion. */
export const pinAllowed = (): boolean =>
  !reducedMotion() && !window.matchMedia('(pointer: coarse)').matches;

/** Touch scroll path on (coarse pointer, no reduced motion); false on a fine pointer, reduced motion, native. */
export const touchMode = (): boolean =>
  users ? touch : typeof window !== 'undefined' && !pinAllowed() && !reducedMotion();

const fixViewport = () => {
  vhFix = window.innerHeight;
  vhW = window.innerWidth;
  document.documentElement.style.setProperty('--vh-fix', `${vhFix}px`);
};

/** Smallest `--p` change written: 4e-4 on desktop; on touch 2e-4 — one pixel of a scene runway (~3e-4) still moves it. */
const minStep = () => (touch ? 2e-4 : 4e-4);

const set = (e: Entry, p: number) => {
  if (Math.abs(p - e.last) > minStep() || (p !== e.last && (p === 0 || p === 1))) {
    e.last = p;
    e.el.style.setProperty('--p', p.toFixed(4));
    e.onChange?.(p);
  }
};

const writeAll = (dt: number) => {
  const vh = touch ? vhFix : window.innerHeight;
  const todo: [Entry, number][] = [];
  entries.forEach((e) => {
    if (e.active) todo.push([e, progressOf(e.el.getBoundingClientRect(), vh, e.mode)]);
  });
  for (const [e, p] of todo) {
    if (!touch) set(e, p);
    else {
      e.cur = e.cur < 0 ? p : approach(e.cur, p, TOUCH_LERP, dt);
      set(e, e.cur);
    }
  }
};

const scrollToY = (y: number) => window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });

const cancelGlide = () => {
  glide = null;
};

/**
 * Touch: polls scrollY, runs the glide, starts one — once per rest — when the page has stood still SNAP_IDLE ms with
 * the finger up inside a snapping scene. The glide follows the direction of the last movement (snapTarget).
 */
const touchStep = (t: number) => {
  const y = window.scrollY;
  if (glide) {
    const off = Math.abs(y - glide.set) > 3;
    // the address bar resized the viewport (the page shifted under the glide): carry on from here
    if (off && t - tp.resizedAt < 400) glide.set = y;
    // someone else moved the page (a link, the keyboard): let go at once, no new glide until the next rest
    else if (off) {
      cancelGlide();
      tp.settled = true;
    } else {
      const k = Math.min(1, (t - glide.start) / glide.dur);
      const next = Math.round(glide.from + (glide.to - glide.from) * easeKit(k));
      if (next !== glide.set) scrollToY(next);
      glide.set = next;
      tp.y = next;
      tp.anchor = next;
      tp.movedAt = t;
      if (k >= 1) {
        cancelGlide();
        tp.settled = true;
      }
      return;
    }
  }
  if (y !== tp.y) {
    if (tp.anchor < 0 || t - tp.resizedAt < 400) tp.anchor = y;
    else if (Math.abs(y - tp.anchor) >= DIR_PX) {
      tp.dir = y > tp.anchor ? 1 : -1;
      tp.anchor = y;
    }
    tp.y = y;
    tp.movedAt = t;
    if (t - tp.resizedAt >= 400) tp.settled = false;
    return;
  }
  if (tp.finger || tp.settled || t - tp.movedAt < SNAP_IDLE) return;
  tp.settled = true;
  for (const e of entries.values()) {
    if (!e.snap || !e.active) continue;
    const r = e.el.getBoundingClientRect();
    const to = snapTarget(y, sceneSnapPoints(r.top + y, r.height, vhFix, e.snap), tp.dir, vhFix);
    if (to === null) continue;
    glide = { from: y, to, start: t, dur: snapDuration(to - y, vhFix), set: y };
    return;
  }
};

const tick = (t: number) => {
  const dt = lastT ? Math.min(100, t - lastT) : 1000 / 60;
  lastT = t;
  lenis?.raf(t);
  if (touch) touchStep(t);
  writeAll(dt);
  if (lenis || touch) raf = requestAnimationFrame(tick);
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
  if (touch && window.innerWidth !== vhW) fixViewport();
  tp.resizedAt = performance.now();
  schedule();
};

// Touch: a finger on the screen holds the snap back and stops a running glide; so do a wheel, keys and a mouse.
const onFingerDown = () => {
  tp.finger = true;
  tp.settled = false;
  tp.anchor = window.scrollY;
  cancelGlide();
};
const onFingerUp = (ev: Event) => {
  if ((ev as TouchEvent).touches?.length) return;
  tp.finger = false;
  tp.movedAt = performance.now();
};
const onInterrupt = () => {
  // a wheel / key / mouse: stop a glide and keep the page where the visitor leaves it until they scroll again
  tp.settled = !!glide || tp.settled;
  tp.movedAt = performance.now();
  cancelGlide();
};
const TOUCH_EVENTS: [string, EventListener][] = [
  ['touchstart', onFingerDown],
  ['touchend', onFingerUp],
  ['touchcancel', onFingerUp],
  ['wheel', onInterrupt],
  ['keydown', onInterrupt],
  ['mousedown', onInterrupt],
];

const revealAll = () =>
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.dataset.revealed = 'true';
  });

const applyMode = () => {
  const html = document.documentElement;
  const pin = pinAllowed();
  const anim = !reducedMotion();
  html.dataset.motion = motionAllowed() ? 'on' : 'off';
  html.dataset.pin = pin ? 'on' : 'off';
  // Cheap time/reveal animations (marquee, Reveal, hero words) also run on touch; only reduced motion stops them.
  html.dataset.anim = anim ? 'on' : 'off';
  const before = touch;
  touch = !pin && anim;
  if (touch) {
    html.dataset.touch = 'on';
    fixViewport();
  } else delete html.dataset.touch;
  if (before !== touch) entries.forEach((e) => (e.cur = -1));
  cancelGlide();
  if (pin && !lenis)
    lenis = new Lenis({ lerp: 0.1, autoRaf: false, smoothWheel: true, wheelMultiplier: 1 });
  if (!pin && lenis) {
    lenis.destroy();
    lenis = null;
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
  entries.forEach((e) => activeIO?.observe(e.el));
  document
    .querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])')
    .forEach((el) => revealIO?.observe(el));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  TOUCH_EVENTS.forEach(([n, f]) => window.addEventListener(n, f, { passive: true, capture: true }));
  // content arriving later (API data, images) moves sections without any scroll event
  if (typeof ResizeObserver !== 'undefined') {
    layoutRO = new ResizeObserver(schedule);
    layoutRO.observe(document.body);
  }
  applyMode();
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
  cancelGlide();
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', onResize);
  TOUCH_EVENTS.forEach(([n, f]) => window.removeEventListener(n, f, { capture: true }));
  layoutRO?.disconnect();
  layoutRO = null;
  activeIO?.disconnect();
  revealIO?.disconnect();
  activeIO = null;
  revealIO = null;
  mqs.splice(0).forEach((mq) => mq.removeEventListener('change', applyMode));
  lenis?.destroy();
  lenis = null;
};

export const registerProgress = (el: MotionEl, opts: RegisterOptions = {}): (() => void) => {
  const e: Entry = {
    el,
    mode: opts.mode ?? 'through',
    active: true,
    last: -1,
    cur: -1,
    snap: opts.snap,
    onChange: opts.onChange,
  };
  entries.set(el, e);
  activeIO?.observe(el);
  set(e, progressOf(el.getBoundingClientRect(), touch ? vhFix : window.innerHeight, e.mode));
  return () => {
    entries.delete(el);
    activeIO?.unobserve(el);
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
  cancelGlide();
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo(0, 0);
};

/** Locks page scroll (full-screen menu). */
export const lockScroll = (locked: boolean): void => {
  if (locked) cancelGlide();
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? 'hidden' : '';
};
