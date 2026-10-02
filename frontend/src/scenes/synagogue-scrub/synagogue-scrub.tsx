import { useCallback, useEffect, useRef, useState } from 'react';

import { assetUrl } from '@/config/demo';
import { Title } from '@/ui/kit';
import { motionAllowed, touchVariant } from '@/ui/motion/engine';
import { useScrollProgress } from '@/ui/motion/hooks';

import {
  coverRect,
  frameIndex,
  improvesFrame,
  nearestLoaded,
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
/** Touch variant 3: play time per chapter. */
const CHAPTER_MS = 3000;

/**
 * Pinned scroll scene: a sticky 100svh canvas inside a (chapters + 1) × 100svh runway;
 * the frame is round(p·(N−1)) of the manifest — strictly by scroll, forward and back. The first frame loads at
 * once, the rest are preloaded after the first paint; until a frame arrives the nearest loaded one is drawn.
 * Chapters enter/leave by `--p` in CSS. Reduced motion: static poster frame + chapters as a swipe ribbon.
 * Touch (`?a=`, see ui/motion/touch-variant.ts): 1 — full set, Lenis syncTouch drives `--p`; 2 — the light
 * 640px set (`manifest.light`), poster on top until the whole set is loaded and decoded, then it scrubs;
 * 3 — the same light set played by time (CHAPTER_MS per chapter) once the scene is on screen.
 * `data-frame` on the canvas = the frame drawn; `data-loaded="all"` on the root once every frame is in.
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
  const imgs = useRef<HTMLImageElement[]>([]);
  const loaded = useRef<boolean[]>([]);
  const progress = useRef(0);
  const drawn = useRef(-1);
  const [m, setM] = useState<ScrubManifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [active, setActive] = useState(0);
  const [tv, setTv] = useState<0 | 1 | 2 | 3>(0);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const n = chapters.length;
  /** Phones on variants 2/3: the light set, poster until it is all in. */
  const light = motion && (tv === 2 || tv === 3);
  const lightRef = useRef(false);
  lightRef.current = light;

  const draw = useCallback(() => {
    const c = canvas.current;
    const list = imgs.current;
    if (!c || !list.length || (lightRef.current && !readyRef.current)) return;
    const k = nearestLoaded(frameIndex(progress.current, list.length), loaded.current);
    if (k < 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    // the same frame at the same size is already on the canvas: no repaint on every --p write
    if (k === drawn.current && c.width === w && c.height === h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const img = list[k];
    const r = coverRect(img.naturalWidth, img.naturalHeight, w, h);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    drawn.current = k;
    c.dataset.frame = String(k);
  }, []);

  useScrollProgress(root, {
    mode: 'pin',
    duration: n * CHAPTER_MS,
    waitFor: () => !lightRef.current || readyRef.current,
    onChange: (p) => {
      progress.current = p;
      if (motion) setActive(Math.min(n - 1, Math.floor(p * n)));
      draw();
    },
  });

  // Live or static follows the media queries (pointer / reduced motion) — the same ones the motion engine watches.
  useEffect(() => {
    const sync = () => {
      setMotion(motionAllowed());
      setTv(touchVariant());
    };
    sync();
    const mqs = ['(pointer: coarse)', '(prefers-reduced-motion: reduce)'].map((q) =>
      window.matchMedia(q)
    );
    mqs.forEach((q) => q.addEventListener('change', sync));
    return () => mqs.forEach((q) => q.removeEventListener('change', sync));
  }, []);

  useEffect(() => {
    let gone = false;
    fetch(manifestUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw) => {
        if (gone) return;
        const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
        const parsed = parseManifest(raw, base);
        if (!parsed) return setFailed(true);
        const tv0 = touchVariant();
        if (!parsed.light || !motionAllowed() || (tv0 !== 2 && tv0 !== 3)) return setM(parsed);
        const lightUrl = parsed.light;
        return fetch(lightUrl)
          .then((r) => (r.ok ? r.json() : null))
          .then((lr) => {
            if (gone) return;
            const lb = lightUrl.slice(0, lightUrl.lastIndexOf('/') + 1);
            setM(parseManifest(lr, lb) ?? parsed);
          })
          .catch(() => !gone && setM(parsed));
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [manifestUrl]);

  // Frames: the one for the current progress first, then the rest (6 at a time, 2 on phones), nearest first.
  useEffect(() => {
    if (!m || !motion) return;
    let gone = false;
    const N = m.frames.length;
    loaded.current = new Array(N).fill(false);
    drawn.current = -1;
    readyRef.current = false;
    setReady(false);
    let count = 0;
    // phones: decode off the main thread before the frame counts as loaded (drawImage then never decodes)
    const decode = window.matchMedia('(pointer: coarse)').matches;
    imgs.current = m.frames.map(() => new Image());
    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = imgs.current[i];
        img.decoding = 'async';
        const done = () => {
          if (!gone) {
            loaded.current[i] = true;
            if (++count === N) {
              readyRef.current = true;
              setReady(true);
              draw();
            } else if (improvesFrame(frameIndex(progress.current, N), i, drawn.current)) draw();
          }
          resolve();
        };
        img.onload = () => {
          if (decode && img.decode) img.decode().then(done, done);
          else done();
        };
        img.onerror = () => resolve();
        img.src = m.frames[i];
      });
    // the light set starts from its poster (shown on top while the rest loads)
    const first = lightRef.current ? m.poster : frameIndex(progress.current, N);
    load(first).then(async () => {
      const queue = Array.from({ length: N }, (_, i) => i).filter((i) => i !== first);
      // each worker takes the frame nearest to the CURRENT scroll position (it moves while frames load)
      const worker = async () => {
        while (!gone && queue.length) {
          const want = frameIndex(progress.current, N);
          let best = 0;
          for (let j = 1; j < queue.length; j++)
            if (Math.abs(queue[j] - want) < Math.abs(queue[best] - want)) best = j;
          await load(queue.splice(best, 1)[0]);
        }
      };
      // phones, full set: fewer parallel downloads so the frame for the current scroll is not queued behind the
      // rest; the light set is wanted whole (poster until then), so latency is hidden by 6 parallel requests
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      await Promise.all(Array.from({ length: coarse && !lightRef.current ? 2 : 6 }, worker));
    });
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => {
      gone = true;
      window.removeEventListener('resize', onResize);
      // abort frames still downloading
      imgs.current.forEach((img, i) => {
        if (loaded.current[i]) return;
        img.onload = null;
        img.onerror = null;
        img.removeAttribute('src');
      });
    };
  }, [m, motion, draw]);

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
      data-loaded={ready ? 'all' : undefined}
      aria-label={ariaLabel}
      role="region"
    >
      <div className="scrub__sticky">
        <div className="scrub__media">
          {motion && m ? (
            <canvas
              ref={canvas}
              className="scrub__canvas"
              data-frames={m.frames.length}
              aria-hidden
            />
          ) : poster ? (
            <img className="scrub__poster" src={poster} alt="" />
          ) : null}
          {motion && light && !ready && poster ? (
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
