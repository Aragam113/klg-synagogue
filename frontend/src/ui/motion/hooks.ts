import { type RefObject, useEffect, useRef, useState } from 'react';

import {
  motionAllowed,
  type MotionEl,
  pinAllowed,
  registerProgress,
  registerReveal,
  type RegisterOptions,
} from './engine';

/**
 * Writes `--p` (0..1) on the element while it is near the viewport. Children inherit it in CSS, e.g.
 *   html[data-motion='on'] .x { transform: rotate(calc(var(--p) * 30deg)); }
 */
export const useScrollProgress = (
  ref: RefObject<MotionEl | null>,
  opts: RegisterOptions = {}
): void => {
  const cb = useRef(opts.onChange);
  const wait = useRef(opts.waitFor);
  useEffect(() => {
    cb.current = opts.onChange;
    wait.current = opts.waitFor;
  });
  const { mode, duration } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerProgress(el, {
      mode,
      duration,
      onChange: (p) => cb.current?.(p),
      waitFor: () => (wait.current ? wait.current() : true),
    });
  }, [ref, mode, duration]);
};

/** One-shot `data-revealed="true"` when 20% of the element is visible (immediately when motion is off). */
export const useReveal = (ref: RefObject<MotionEl | null>): void => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerReveal(el);
  }, [ref]);
};

const useMediaFlag = (read: () => boolean): boolean => {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const sync = () => setOn(read());
    sync();
    const mqs = ['(pointer: coarse)', '(prefers-reduced-motion: reduce)'].map((q) =>
      window.matchMedia(q)
    );
    mqs.forEach((q) => q.addEventListener('change', sync));
    return () => mqs.forEach((q) => q.removeEventListener('change', sync));
  }, [read]);
  return on;
};

/** Live `motionAllowed()` (no reduced motion; touch included): follows the same media queries as the engine. */
export const useMotionOn = (): boolean => useMediaFlag(motionAllowed);

/** Live `pinAllowed()` (fine pointer, no reduced motion): pinned chapters instead of the swipe ribbon. */
export const usePinOn = (): boolean => useMediaFlag(pinAllowed);
