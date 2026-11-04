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
 * sessionStorage key: the full preloader (the star) already ran in this browser session. A later load in the same
 * session (reload, new page of the site opened at `/`) goes the quick way: see QUICK_MS.
 */
export const PRELOADER_KEY = 'synagogue.preloaded';
const HOLD_MS = 150;
const LEAVE_MS = 600;
/**
 * Repeat load in the session (warm cache): the layer only waits for the critical content (fonts, API, first images —
 * not the scene's frames, they fill in the background), without drawing; if it is
 * all in by QUICK_MS the layer simply fades out (QUICK_LEAVE_MS), otherwise the star is drawn as on the first visit.
 */
export const QUICK_MS = 700;
const QUICK_LEAVE_MS = 300;
/**
 * The preloader already ran in this page (JS context): returning to `/` by client navigation (logo, menu, «back»)
 * does not show it again — fonts, API answers and the scene's frames are already in memory.
 */
let ranThisPage = false;

const seenThisSession = (): boolean => {
  try {
    return window.sessionStorage.getItem(PRELOADER_KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = (): void => {
  try {
    window.sessionStorage.setItem(PRELOADER_KEY, '1');
  } catch {
    /* private mode: the full preloader again next time */
  }
};
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
  markSeen();
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
 * the site shows anyway and the scene keeps loading in the background. The star is drawn on the first load of the
 * browser session; a later load in the session (PRELOADER_KEY) waits up to QUICK_MS without drawing and just fades if
 * everything is in (warm cache), a client-side return to `/` shows nothing (ranThisPage); reduced motion skips it. Sets html[data-app-ready] when it leaves (the hero animations wait for it) and, for the benches,
 * `data-preload-ms` (its own duration), `data-preload-at` (since navigation start), `data-preload-scene` (cache share).
 */
export const Preloader = () => {
  // a client-side return to `/` mounts straight as done (hydration of a real load always starts with 'run')
  const [state, setState] = useState<'run' | 'leave' | 'done'>(() =>
    ranThisPage ? 'done' : 'run'
  );
  const [quick, setQuick] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const line = useRef<SVGPathElement>(null);
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const api = useSelector(selectApi);
  const live = useRef({ fonts: false, api: '0/0' });
  live.current = { fonts: fontsLoaded || !!fontError, api };

  useEffect(() => {
    if (state === 'done') {
      // client-side return to `/`: the hero animations still key off html[data-app-ready]
      document.documentElement.dataset.appReady = 'true';
      return;
    }
    ranThisPage = true;
    if (reducedMotion()) {
      ready(performance.now());
      setState('done');
      return;
    }
    setQuick(seenThisSession());
    setSize({ w: window.innerWidth, h: window.innerHeight });
    // mount only: `state` is read as it was mounted
  }, []);

  useEffect(() => {
    const el = line.current;
    if (!size || !el) return;
    const prof = penProfile(size.w, size.h);
    const start = performance.now();
    // the pen's own clock: from the start, or (quick way, not everything in by QUICK_MS) from that moment
    let penFrom = start;
    let waiting = quick;
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
    const leave = (ms: number) => {
      ready(start);
      setState('leave');
      timer = setTimeout(() => setState('done'), ms);
    };
    const frame = (now: number) => {
      if (waiting) {
        // quick way: no drawing while the warm cache catches up; all in → fade out, too slow → draw the star.
        // The scene's frames are not waited for here: the scroll scene has its fallback and fills in the background.
        const warm = tasks(now).map((x) => (x.key === 'scene' ? { ...x, f: 1 } : x));
        if (loadShare(warm) >= 1) {
          doneAt = now;
          leave(QUICK_LEAVE_MS);
          return;
        }
        if (now - start < QUICK_MS) {
          raf = requestAnimationFrame(frame);
          return;
        }
        waiting = false;
        penFrom = now;
        last = now;
      }
      const allowed = penAllowance(loadShare(tasks(now)), now - penFrom, prof);
      st = penStep(st, now - last, allowed, prof);
      last = now;
      el.style.strokeDashoffset = String(1 - prof.arcAt(st.tau));
      if (st.tau >= 1) {
        doneAt = now;
        timer = setTimeout(() => leave(LEAVE_MS), HOLD_MS);
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
          leave(LEAVE_MS);
        }
      },
      CEIL_MS + MIN_DRAW_MS + 1000 + (quick ? QUICK_MS : 0)
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      clearTimeout(ceiling);
    };
  }, [size, quick]);

  if (state === 'done') return null;
  return (
    <div
      className={`preloader ${quick ? 'preloader--quick' : ''} ${state === 'leave' ? 'preloader--leave' : ''}`}
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
