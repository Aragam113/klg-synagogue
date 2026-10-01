import { useCallback, useEffect, useRef, useState } from 'react';

import { Title } from '@/ui/kit';
import { motionAllowed } from '@/ui/motion/engine';
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
  /** manifest.json of the frames (spec R05); frames resolve relative to its folder. */
  manifest?: string;
  /** Prefix of the corner attribution, e.g. «Кадры:». */
  creditsLabel?: string;
  /** Accessible name of the scene. */
  ariaLabel?: string;
}

const DEFAULT_MANIFEST = '/media/scrub/manifest.json';
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pinned scroll scene (spec R04, «Решение 4»): a sticky 100svh canvas inside a (chapters + 1) × 100svh runway;
 * the frame is round(p·(N−1)) of the manifest — strictly by scroll, forward and back. The first frame loads at
 * once, the rest are preloaded after the first paint; until a frame arrives the nearest loaded one is drawn.
 * Chapters enter/leave by `--p` in CSS. On touch / reduced motion: static poster frame + chapters stacked.
 * `data-frame` on the canvas = the frame drawn (used by the smoke test).
 */
export const SynagogueScrub = ({
  chapters,
  manifest: manifestUrl = DEFAULT_MANIFEST,
  creditsLabel = '',
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
  const n = chapters.length;

  const draw = useCallback(() => {
    const c = canvas.current;
    const list = imgs.current;
    if (!c || !list.length) return;
    const k = nearestLoaded(frameIndex(progress.current, list.length), loaded.current);
    if (k < 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (!w || !h) return;
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
    onChange: (p) => {
      progress.current = p;
      setActive(Math.min(n - 1, Math.floor(p * n)));
      draw();
    },
  });

  // Live or static follows the media queries (pointer / reduced motion) — the same ones the motion engine watches.
  useEffect(() => {
    const sync = () => setMotion(motionAllowed());
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
        if (parsed) setM(parsed);
        else setFailed(true);
      })
      .catch(() => !gone && setFailed(true));
    return () => {
      gone = true;
    };
  }, [manifestUrl]);

  // Frames: the one for the current progress first, then the rest (6 at a time) after it has been drawn.
  useEffect(() => {
    if (!m || !motion) return;
    let gone = false;
    const N = m.frames.length;
    loaded.current = new Array(N).fill(false);
    drawn.current = -1;
    imgs.current = m.frames.map(() => new Image());
    const load = (i: number) =>
      new Promise<void>((resolve) => {
        const img = imgs.current[i];
        img.decoding = 'async';
        img.onload = () => {
          if (!gone) {
            loaded.current[i] = true;
            if (improvesFrame(frameIndex(progress.current, N), i, drawn.current)) draw();
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = m.frames[i];
      });
    const first = frameIndex(progress.current, N);
    load(first).then(async () => {
      const queue = Array.from({ length: N }, (_, i) => i).filter((i) => i !== first);
      const worker = async () => {
        while (!gone && queue.length) await load(queue.shift() as number);
      };
      await Promise.all(Array.from({ length: 6 }, worker));
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

  const poster = m ? m.frames[m.poster] : null;
  return (
    <div
      ref={root}
      className={`scrub ${motion ? 'scrub--live' : 'scrub--static'}`}
      style={{ ['--chapters' as string]: n }}
      data-active={active}
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
        <ol className="scrub__chapters">
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
        {m?.credits ? (
          <p className="scrub__credits">
            {creditsLabel ? `${creditsLabel} ` : ''}
            {m.credits}
          </p>
        ) : null}
      </div>
    </div>
  );
};
