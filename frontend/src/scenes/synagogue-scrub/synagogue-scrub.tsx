import { useCallback, useEffect, useRef, useState } from 'react';

import { assetUrl } from '@/config/demo';
import { Title } from '@/ui/kit';
import { motionAllowed, touchMode } from '@/ui/motion/engine';
import { useScrollProgress } from '@/ui/motion/hooks';

import {
  type Blend,
  blendFrames,
  coarsePass,
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
/** Phones: the first pass loads every COARSE-th frame; the scene scrubs (crossfading over the gaps) once it is in. */
const COARSE = 4;
/** Blend alpha is drawn in steps of 1/ALPHA_STEPS: a tiny `--p` change does not repaint the canvas. */
const ALPHA_STEPS = 32;

/**
 * Pinned scroll scene: a sticky 100svh canvas inside a (chapters + 1) × 100svh runway.
 * Desktop: the full set, frame = round(p·(N−1)) strictly by scroll; the frame for the current progress loads first,
 * the rest after it, nearest first; until a frame arrives the nearest loaded one is drawn.
 * Touch (`html[data-touch]`): the light set (`manifest.light`), loaded progressively — the poster, then every 4th
 * frame (the poster stays on top until this first pass is in, then the scene scrubs), then the frames between.
 * The canvas crossfades the two loaded frames around the fractional position p·(N−1) (frame a, then b with
 * globalAlpha = the fraction) and repaints only when (a, b, alpha/32) changes. The engine pulls the page to the
 * nearest chapter stop once the scroll rests inside (`snap`).
 * Chapters enter/leave by `--p` in CSS. Reduced motion: static poster frame + chapters as a swipe ribbon.
 * `data-frame` (dominant frame), `data-blend` (alpha) and `data-draws` (repaints) on the canvas; on the root
 * `data-pass="coarse"` once it scrubs on a phone and `data-loaded="all"` once every frame is in.
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
  const drawnKey = useRef('');
  const draws = useRef(0);
  const [m, setM] = useState<ScrubManifest | null>(null);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [active, setActive] = useState(0);
  const [touch, setTouch] = useState(false);
  /** touch: the coarse pass is in (scrubs); desktop: every frame is in */
  const [ready, setReady] = useState(false);
  const [all, setAll] = useState(false);
  const readyRef = useRef(false);
  const n = chapters.length;
  /** Phones: the light set, poster until its first pass is in. */
  const light = motion && touch;
  const lightRef = useRef(false);
  lightRef.current = light;

  const draw = useCallback(() => {
    const c = canvas.current;
    const list = imgs.current;
    if (!c || !list.length || (lightRef.current && !readyRef.current)) return;
    let bl: Blend | null;
    if (lightRef.current) {
      const x = Math.min(1, Math.max(0, progress.current)) * (list.length - 1);
      bl = blendFrames(x, loaded.current);
      if (bl) {
        const q = Math.round(bl.alpha * ALPHA_STEPS) / ALPHA_STEPS;
        bl =
          q <= 0
            ? { a: bl.a, b: bl.a, alpha: 0 }
            : q >= 1
              ? { a: bl.b, b: bl.b, alpha: 0 }
              : { ...bl, alpha: q };
      }
    } else {
      const k = nearestLoaded(frameIndex(progress.current, list.length), loaded.current);
      bl = k < 0 ? null : { a: k, b: k, alpha: 0 };
    }
    if (!bl) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
    // the same picture at the same size is already on the canvas: no repaint on every --p write
    const key = `${bl.a}:${bl.b}:${bl.alpha}`;
    if (key === drawnKey.current && c.width === w && c.height === h) return;
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const img = list[bl.a];
    const r = coverRect(img.naturalWidth, img.naturalHeight, w, h);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    if (bl.alpha > 0) {
      ctx.globalAlpha = bl.alpha;
      ctx.drawImage(list[bl.b], r.x, r.y, r.w, r.h);
      ctx.globalAlpha = 1;
    }
    drawnKey.current = key;
    drawn.current = bl.alpha < 0.5 ? bl.a : bl.b;
    c.dataset.frame = String(drawn.current);
    c.dataset.blend = String(bl.alpha);
    c.dataset.draws = String(++draws.current);
  }, []);

  useScrollProgress(root, {
    mode: 'pin',
    snap: light ? n : undefined,
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
      setTouch(touchMode());
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
        if (!parsed.light || !motionAllowed() || !touchMode()) return setM(parsed);
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

  // Frames. Desktop: the one for the current progress first, then the rest (6 at a time), nearest first.
  // Phones: the poster, then the coarse pass (every 4th) → scrubs, then the frames between, nearest first.
  useEffect(() => {
    if (!m || !motion) return;
    let gone = false;
    const N = m.frames.length;
    const phone = lightRef.current;
    loaded.current = new Array(N).fill(false);
    drawn.current = -1;
    drawnKey.current = '';
    readyRef.current = false;
    setReady(false);
    setAll(false);
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
              setAll(true);
              draw();
            } else if (phone) draw();
            else if (improvesFrame(frameIndex(progress.current, N), i, drawn.current)) draw();
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
    // each worker takes the queued frame nearest to the CURRENT scroll position (it moves while frames load)
    const drain = (queue: number[], workers: number) => {
      const worker = async () => {
        while (!gone && queue.length) {
          const want = frameIndex(progress.current, N);
          let best = 0;
          for (let j = 1; j < queue.length; j++)
            if (Math.abs(queue[j] - want) < Math.abs(queue[best] - want)) best = j;
          await load(queue.splice(best, 1)[0]);
        }
      };
      return Promise.all(Array.from({ length: workers }, worker));
    };
    const first = phone ? m.poster : frameIndex(progress.current, N);
    load(first).then(async () => {
      if (!phone) {
        await drain(
          Array.from({ length: N }, (_, i) => i).filter((i) => i !== first),
          6
        );
        return;
      }
      const pass = coarsePass(N, COARSE);
      await drain(
        pass.filter((i) => i !== first),
        6
      );
      if (gone) return;
      readyRef.current = true;
      setReady(true);
      draw();
      await drain(
        Array.from({ length: N }, (_, i) => i).filter((i) => i !== first && !pass.includes(i)),
        4
      );
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
      data-pass={light && ready ? 'coarse' : undefined}
      data-loaded={all ? 'all' : undefined}
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
