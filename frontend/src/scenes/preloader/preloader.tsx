import { useEffect, useState } from 'react';

import { reducedMotion } from '@/ui/motion';

import './styles';

/** sessionStorage key: the preloader has been shown in this session. */
export const PRELOADER_KEY = 'synagogue.preloaded';
/** One even stroke across the screen (the CSS animation in preloader.css uses the same duration). */
export const DRAW_MS = 1900;
const HOLD_MS = 150;
const LEAVE_MS = 600;

const ready = () => {
  if (typeof document !== 'undefined') document.documentElement.dataset.appReady = 'true';
};

const seen = (): boolean => {
  try {
    return sessionStorage.getItem(PRELOADER_KEY) === '1';
  } catch {
    return false;
  }
};

const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

/**
 * One continuous line: from the left edge along the horizon to the star, around the Star of David (two
 * triangles), out of its right side and on to the right edge. The star's sides cross the horizon exactly at
 * ±R/√3 (L and P below) — that is where the line enters and leaves. A hexagram plus two leads has four odd
 * vertices, so no single pass exists: the stroke retraces three short inner segments (L → P across the top of
 * the inner hexagon) on top of lines already drawn, which reads as one line.
 */
export const starLinePath = (w: number, h: number): string => {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.17;
  const s = (Math.sqrt(3) / 2) * R; // half-width of a triangle
  const q = R / Math.sqrt(3); // where the sides cross the horizon
  const at = (dx: number, dy: number) => pt(cx + dx, cy + dy);
  // Up triangle: T (top), BR, BL. Down triangle: B (bottom), TL, TR.
  const T = at(0, -R);
  const BR = at(s, R / 2);
  const BL = at(-s, R / 2);
  const B = at(0, R);
  const TL = at(-s, -R / 2);
  const TR = at(s, -R / 2);
  const L = at(-q, 0);
  const P = at(q, 0);
  // Inner hexagon points on the way L → P over the top (sides cross at ±60°/120°).
  const I120 = at(-q / 2, -R / 2);
  const I60 = at(q / 2, -R / 2);
  return [
    `M ${pt(0, cy)}`,
    `L ${L}`,
    // up triangle, starting and ending at L
    `L ${BL}`,
    `L ${BR}`,
    `L ${P}`,
    `L ${T}`,
    `L ${L}`,
    // down triangle, starting and ending at L
    `L ${TL}`,
    `L ${TR}`,
    `L ${P}`,
    `L ${B}`,
    `L ${L}`,
    // retrace to the right crossing over lines already drawn
    `L ${I120}`,
    `L ${I60}`,
    `L ${P}`,
    // and out to the right edge
    `L ${pt(w, cy)}`,
  ].join(' ');
};

/**
 * Preloader (R11.1, changed by the owner): a single thin line runs left to right and, in the middle, draws
 * a Star of David in the same stroke (stroke-dashoffset), then the layer leaves in .6s. ~2.1 s to ready;
 * skipped on a repeat visit in the session and with reduced motion (shown on touch devices too). Sets html[data-app-ready] when done —
 * the hero animations wait for it.
 */
export const Preloader = () => {
  const [state, setState] = useState<'run' | 'leave' | 'done'>('run');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (seen() || reducedMotion()) {
      ready();
      setState('done');
      return;
    }
    setSize({ w: window.innerWidth, h: window.innerHeight });
    const leave = setTimeout(() => {
      try {
        sessionStorage.setItem(PRELOADER_KEY, '1');
      } catch {
        /* storage blocked (private mode): the preloader will simply show again next time */
      }
      ready();
      setState('leave');
    }, DRAW_MS + HOLD_MS);
    const done = setTimeout(() => setState('done'), DRAW_MS + HOLD_MS + LEAVE_MS);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

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
          <path className="preloader__line" d={starLinePath(size.w, size.h)} pathLength={1} />
        </svg>
      ) : null}
    </div>
  );
};
