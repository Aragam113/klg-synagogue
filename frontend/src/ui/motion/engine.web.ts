import Lenis from 'lenis';

import type { MotionEl, ProgressMode, RegisterOptions } from './engine';
import { progressOf } from './progress';

/**
 * Web scroll engine. ONE rAF writes `--p` (0..1, toFixed(4), change threshold 4e-4) into
 * registered elements. Fine pointer: Lenis (lerp .1) driven by a continuous rAF loop. Touch: NATIVE
 * scroll — no Lenis, nothing intercepts the finger; passive scroll/resize listeners schedule a single rAF.
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
  last: number;
  onChange?: (p: number) => void;
}

const entries = new Map<Element, Entry>();
let lenis: Lenis | null = null;
let raf = 0;
let loop = false;
let users = 0;
let activeIO: IntersectionObserver | null = null;
let revealIO: IntersectionObserver | null = null;
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

const write = (e: Entry, vh: number) => {
  const p = progressOf(e.el.getBoundingClientRect(), vh, e.mode);
  if (Math.abs(p - e.last) > 4e-4 || (p !== e.last && (p === 0 || p === 1))) {
    e.last = p;
    e.el.style.setProperty('--p', p.toFixed(4));
    e.onChange?.(p);
  }
};

const writeAll = () => {
  const vh = window.innerHeight;
  entries.forEach((e) => {
    if (e.active) write(e, vh);
  });
};

/** Fine pointer: Lenis needs a frame every frame. */
const tick = (t: number) => {
  lenis?.raf(t);
  writeAll();
  raf = loop ? requestAnimationFrame(tick) : 0;
};

/** Touch: one rAF per burst of native scroll/resize events. */
const schedule = () => {
  if (raf || !users) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    writeAll();
  });
};

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
  if (pin && !lenis)
    lenis = new Lenis({ lerp: 0.1, autoRaf: false, smoothWheel: true, wheelMultiplier: 1 });
  if (!pin && lenis) {
    lenis.destroy();
    lenis = null;
  }
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  loop = pin;
  if (loop) raf = requestAnimationFrame(tick);
  else schedule();
  if (!anim) revealAll();
};

export const startEngine = (): void => {
  if (typeof window === 'undefined' || users++ > 0) return;
  activeIO = new IntersectionObserver(
    (list) => {
      list.forEach((x) => {
        const e = entries.get(x.target);
        if (e) e.active = x.isIntersecting;
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
  window.addEventListener('resize', schedule, { passive: true });
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
  loop = false;
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
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
    onChange: opts.onChange,
  };
  entries.set(el, e);
  activeIO?.observe(el);
  write(e, window.innerHeight);
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
