import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { FONTS } from '@/ui/fonts';
import { reducedMotion } from '@/ui/motion';

import { loadOf } from './load-gate';
import {
  CEIL_MS,
  MIN_DRAW_MS,
  penAllowance,
  penProfile,
  penStep,
  type PenState,
  starLinePath,
} from './pen';
import { loadShare, type LoadTask, sceneWorthWaiting } from './progress';
import './styles';

export { CEIL_MS, MIN_DRAW_MS, penKeyframes, starLinePath } from './pen';

/**
 * sessionStorage key the preloader used to skip repeat visits. Now the preloader
 * shows on every load/reload; the key is no longer written or read and stays exported only for compatibility.
 */
export const PRELOADER_KEY = 'synagogue.preloaded';
const HOLD_MS = 150;
const LEAVE_MS = 600;
/** A task that never reported by then (no queries, no scene on the page) counts as done. */
const SILENT_MS = 2500;

type ApiState = { api?: { queries?: Record<string, { status?: string } | undefined> } };

/** RTK Query answers of the page: [settled, total]. */
const selectApi = (s: ApiState): string => {
  const qs = Object.values(s.api?.queries ?? {});
  return `${qs.filter((q) => q?.status === 'fulfilled' || q?.status === 'rejected').length}/${qs.length}`;
};

/** Images in the first screen (not lazy): share already decoded/complete; none → 1. */
const firstImages = (): number => {
  const vh = window.innerHeight;
  const list = Array.from(document.images).filter((img) => {
    if (img.loading === 'lazy') return false;
    const r = img.getBoundingClientRect();
    return r.bottom > 0 && r.top < vh && r.width > 0;
  });
  return list.length ? list.filter((i) => i.complete).length / list.length : 1;
};

const ready = (startedAt: number) => {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.dataset.appReady = 'true';
  // measurements (smokes / benches): ms from navigation start, ms of the preloader itself, scene cache share
  html.dataset.preloadAt = String(Math.round(performance.now()));
  html.dataset.preloadMs = String(Math.round(performance.now() - startedAt));
  const scene = loadOf('scene');
  html.dataset.preloadScene = scene === undefined ? 'none' : String(+scene.toFixed(2));
};

/**
 * Preloader: a single thin line runs left to right and, in the middle, draws a Star of David in the same stroke
 * (stroke-dashoffset), then the layer leaves in .6 s. The pen follows the REAL loading of the page (penAllowance):
 * the lead-in is free, the star forms as the critical content arrives — fonts, the home API answers, the first-screen
 * images and the scroll scene's frame cache (`scene`, load-gate; weighted by size: loadShare) — and the line goes out
 * to the right once everything is in. The scene is waited for only while its pace lets it finish before the ceiling
 * (sceneWorthWaiting): a slow network does not hold the site for a cache that will not make it. Never faster than MIN_DRAW_MS (fast connection, warm cache: the star still forms
 * at full speed), slowing and picking up speed smoothly (penStep), creeping on while the loading stalls; past CEIL_MS
 * the site shows anyway and the scene keeps loading in the background. Shown on every load and reload, skipped only
 * with reduced motion. Sets html[data-app-ready] when it leaves (the hero animations wait for it) and, for the benches,
 * `data-preload-ms` (its own duration), `data-preload-at` (since navigation start), `data-preload-scene` (cache share).
 */
export const Preloader = () => {
  const [state, setState] = useState<'run' | 'leave' | 'done'>('run');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const line = useRef<SVGPathElement>(null);
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const api = useSelector(selectApi);
  const live = useRef({ fonts: false, api: '0/0' });
  live.current = { fonts: fontsLoaded || !!fontError, api };

  useEffect(() => {
    if (reducedMotion()) {
      ready(performance.now());
      setState('done');
      return;
    }
    setSize({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  useEffect(() => {
    const el = line.current;
    if (!size || !el) return;
    const prof = penProfile(size.w, size.h);
    const start = performance.now();
    let st: PenState = { tau: 0, v: 0 };
    let last = start;
    let raf = 0;
    let images = 0;
    let imagesAt = -1e9;
    let doneAt = 0;
    let sceneFrom = 0;
    let sceneDropped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tasks = (now: number): LoadTask[] => {
      const t = now - start;
      const [settled, total] = live.current.api.split('/').map(Number);
      if (now - imagesAt > 250) {
        images = firstImages();
        imagesAt = now;
      }
      const scene = loadOf('scene');
      if (scene !== undefined && !sceneFrom) sceneFrom = now;
      // too slow to make it before the ceiling: stop waiting, it goes on loading in the background
      if (!sceneDropped)
        sceneDropped = !sceneWorthWaiting({
          f: scene,
          loadingMs: sceneFrom ? now - sceneFrom : 0,
          elapsedMs: t,
        });
      return [
        { key: 'fonts', f: live.current.fonts ? 1 : 0 },
        { key: 'api', f: total ? settled / total : t > SILENT_MS ? 1 : 0 },
        { key: 'images', f: images },
        { key: 'scene', f: sceneDropped ? 1 : (scene ?? 0) },
      ];
    };
    const frame = (now: number) => {
      const allowed = penAllowance(loadShare(tasks(now)), now - start, prof);
      st = penStep(st, now - last, allowed, prof);
      last = now;
      el.style.strokeDashoffset = String(1 - prof.arcAt(st.tau));
      if (st.tau >= 1) {
        doneAt = now;
        timer = setTimeout(() => {
          ready(start);
          setState('leave');
          timer = setTimeout(() => setState('done'), LEAVE_MS);
        }, HOLD_MS);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // a background tab has no rAF: the ceiling still lets the site in
    const ceiling = setTimeout(
      () => {
        if (!doneAt) {
          cancelAnimationFrame(raf);
          el.style.strokeDashoffset = '0';
          ready(start);
          setState('leave');
          timer = setTimeout(() => setState('done'), LEAVE_MS);
        }
      },
      CEIL_MS + MIN_DRAW_MS + 1000
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(ceiling);
    };
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
