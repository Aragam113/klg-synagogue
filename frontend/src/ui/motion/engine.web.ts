import Lenis from 'lenis';

import type { MotionEl, ProgressMode, RegisterOptions } from './engine';
import { progressOf } from './progress';

/**
 * Web scroll engine (reference: halalcash). Lenis (lerp .1) + ONE rAF that writes `--p` (0..1, toFixed(4),
 * change threshold 4e-4) into registered elements. IntersectionObserver switches far-away elements off and sets
 * one-shot `data-revealed`. `html[data-motion]` is "on" only for a fine pointer without reduced motion;
 * all CSS choreography is gated by it, so with "off" everything is static and visible.
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
let users = 0;
let activeIO: IntersectionObserver | null = null;
let revealIO: IntersectionObserver | null = null;
const mqs: MediaQueryList[] = [];

export { progressOf } from './progress';

/** The visitor asked the OS for reduced motion (one-off animations such as the preloader check only this). */
export const reducedMotion = (): boolean =>
  typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Scroll-driven motion: fine pointer and no reduced motion. */
export const motionAllowed = (): boolean =>
  !reducedMotion() && !window.matchMedia('(pointer: coarse)').matches;

const write = (e: Entry, vh: number) => {
  const p = progressOf(e.el.getBoundingClientRect(), vh, e.mode);
  if (Math.abs(p - e.last) > 4e-4 || (p !== e.last && (p === 0 || p === 1))) {
    e.last = p;
    e.el.style.setProperty('--p', p.toFixed(4));
    e.onChange?.(p);
  }
};

const tick = (t: number) => {
  lenis?.raf(t);
  const vh = window.innerHeight;
  entries.forEach((e) => {
    if (e.active) write(e, vh);
  });
  raf = requestAnimationFrame(tick);
};

const revealAll = () =>
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.dataset.revealed = 'true';
  });

const applyMode = () => {
  const on = motionAllowed();
  document.documentElement.dataset.motion = on ? 'on' : 'off';
  if (on && !lenis)
    lenis = new Lenis({ lerp: 0.1, autoRaf: false, smoothWheel: true, wheelMultiplier: 1 });
  if (!on && lenis) {
    lenis.destroy();
    lenis = null;
  }
  if (!on) revealAll();
};

export const startEngine = (): void => {
  if (typeof window === 'undefined' || users++ > 0) return;
  activeIO = new IntersectionObserver(
    (list) =>
      list.forEach((x) => {
        const e = entries.get(x.target);
        if (e) e.active = x.isIntersecting;
      }),
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
  applyMode();
  for (const q of ['(pointer: coarse)', '(prefers-reduced-motion: reduce)']) {
    const mq = window.matchMedia(q);
    mq.addEventListener('change', applyMode);
    mqs.push(mq);
  }
  raf = requestAnimationFrame(tick);
};

export const stopEngine = (): void => {
  if (--users > 0) return;
  cancelAnimationFrame(raf);
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
  if (document.documentElement.dataset.motion !== 'on') el.dataset.revealed = 'true';
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
