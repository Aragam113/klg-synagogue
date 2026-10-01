import { useEffect, useRef, useState } from 'react';

import { reducedMotion } from '@/ui/motion';

import { DRAW_MS, penKeyframes, starLinePath } from './pen';
import './styles';

export { DRAW_MS, penKeyframes, starLinePath } from './pen';

/**
 * sessionStorage key the preloader used to skip repeat visits. Now the preloader
 * shows on every load/reload; the key is no longer written or read and stays exported only for compatibility.
 */
export const PRELOADER_KEY = 'synagogue.preloaded';
const HOLD_MS = 150;
const LEAVE_MS = 600;

const ready = () => {
  if (typeof document !== 'undefined') document.documentElement.dataset.appReady = 'true';
};

/**
 * Preloader: a single thin line runs left to right and, in the middle, draws
 * a Star of David in the same stroke (stroke-dashoffset), then the layer leaves in .6s. The pen is quick on
 * the straight leads and slows down ~2.25× while the star forms (Web Animations keyframes from
 * penKeyframes). ~3.15 s to ready; shown on every load and reload, skipped only with reduced motion
 * (shown on touch devices too). Sets html[data-app-ready] when done — the hero animations wait for it.
 */
export const Preloader = () => {
  const [state, setState] = useState<'run' | 'leave' | 'done'>('run');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const line = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (reducedMotion()) {
      ready();
      setState('done');
      return;
    }
    setSize({ w: window.innerWidth, h: window.innerHeight });
    const leave = setTimeout(() => {
      ready();
      setState('leave');
    }, DRAW_MS + HOLD_MS);
    const done = setTimeout(() => setState('done'), DRAW_MS + HOLD_MS + LEAVE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  useEffect(() => {
    const el = line.current;
    if (!size || !el || typeof el.animate !== 'function') return;
    const frames = penKeyframes(size.w, size.h).map((f) => ({
      offset: f.offset,
      strokeDashoffset: `${f.dash}`,
    }));
    const run = el.animate(frames, { duration: DRAW_MS, easing: 'linear', fill: 'forwards' });
    return () => run.cancel();
  }, [size]);

  if (state === 'done') return null;
  return (
    <div
      className={`preloader ${state === 'leave' ? 'preloader--leave' : ''}`}
      aria-hidden
      data-preloader
    >
      {size ? (
        <svg
          className="preloader__svg"
          viewBox={`0 0 ${size.w} ${size.h}`}
          width={size.w}
          height={size.h}
        >
          <path
            ref={line}
            className="preloader__line"
            d={starLinePath(size.w, size.h)}
            pathLength={1}
          />
        </svg>
      ) : null}
    </div>
  );
};
