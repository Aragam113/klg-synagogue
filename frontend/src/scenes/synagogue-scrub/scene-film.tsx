import { useEffect, useRef } from 'react';

import { filmMove } from './scrub-model';

export interface SceneFilmProps {
  /** forward and reversed film (the same segment), seconds `duration` */
  src: string;
  rev: string;
  duration: number;
  /** chapter holds, seconds of the forward film */
  holds: number[];
  /** the chapter the scroll is in: the film plays to its hold */
  chapter: number;
  /** first frame while the film loads */
  poster?: string;
  /** the first frame of the film is on screen */
  onReady: () => void;
  /** the browser refused to play (iOS low-power mode, no codec): the scene falls back to frames */
  onFail: () => void;
}

type Video = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/** Seconds from a hold at which the film counts as arrived (half a 25 fps frame). */
const ARRIVED = 0.02;

/**
 * Phone scene, «chapter film» (?s=2): the scroll does not scrub the film — crossing into a chapter plays the film in
 * real time (hardware decoder, the browser's own frame pacing) from where it is to that chapter's hold, at
 * FILM_RATE per chapter (filmMove); back up — the reversed file plays the same way (no backward decoding). Two stacked
 * `<video>` (forward, reversed), one shown (`data-on`); a switch of direction seeks the other one to the mirrored
 * position first and shows it only once that frame is ready — never a blank frame. The first sync jumps straight to
 * the hold. Containers: `data-pos` (seconds of the forward film), `data-dir` (1 | -1 | 0), `data-target`.
 */
export const SceneFilm = ({
  src,
  rev,
  duration,
  holds,
  chapter,
  poster,
  onReady,
  onFail,
}: SceneFilmProps) => {
  const box = useRef<HTMLDivElement>(null);
  const fwd = useRef<Video>(null);
  const bwd = useRef<Video>(null);
  const shown = useRef<'f' | 'r'>('f');
  const gen = useRef(0);
  const synced = useRef(false);
  /** a chapter run is playing (the first-frame nudge must not pause it) */
  const running = useRef(false);
  const cb = useRef({ onReady, onFail });
  cb.current = { onReady, onFail };

  useEffect(() => {
    const f = fwd.current;
    const r = bwd.current;
    if (!f || !r) return undefined;
    let ready = false;
    const first = () => {
      if (ready) return;
      ready = true;
      cb.current.onReady();
      // the reversed film only once the forward one plays
      if (!r.getAttribute('src')) {
        r.src = rev;
        r.load();
      }
    };
    const fail = () => cb.current.onFail();
    // iOS may load only the metadata (preload is a hint): any sign of a frame counts
    const EVENTS = ['loadeddata', 'canplay', 'playing', 'seeked'];
    EVENTS.forEach((e) => f.addEventListener(e, first));
    f.addEventListener('error', fail);
    if (f.readyState >= 2) first();
    // still no frame after a while: a muted play + pause decodes the first one — and tells early when the browser
    // refuses to play at all (iOS low-power mode), so the scene falls back to frames before anyone scrolls to it
    const nudge = window.setTimeout(() => {
      if (ready || f.readyState >= 2) return;
      f.play().then(() => {
        if (!running.current) f.pause();
      }, fail);
    }, 1500);
    return () => {
      window.clearTimeout(nudge);
      EVENTS.forEach((e) => f.removeEventListener(e, first));
      f.removeEventListener('error', fail);
    };
  }, [rev]);

  useEffect(() => {
    const f = fwd.current;
    const r = bwd.current;
    const el = box.current;
    if (!f || !r || !el) return;
    const target = holds[Math.max(0, Math.min(holds.length - 1, chapter))] ?? 0;
    const my = ++gen.current;
    const alive = () => my === gen.current;
    const pos = () => (shown.current === 'f' ? f.currentTime : duration - r.currentTime);
    const show = (which: 'f' | 'r') => {
      shown.current = which;
      f.toggleAttribute('data-on', which === 'f');
      r.toggleAttribute('data-on', which === 'r');
    };
    const seekTo = (v: Video, t: number) =>
      new Promise<void>((done) => {
        const go = () => {
          if (Math.abs(v.currentTime - t) < 0.001) return done();
          v.addEventListener('seeked', () => done(), { once: true });
          v.currentTime = t;
        };
        if (v.readyState >= 1) go();
        else v.addEventListener('loadedmetadata', go, { once: true });
      });
    el.dataset.target = target.toFixed(2);
    if (!synced.current) {
      // the first sync (load, reload mid-scene): straight to the hold, no playback
      synced.current = true;
      void seekTo(f, target).then(() => {
        if (alive()) el.dataset.pos = target.toFixed(2);
      });
      return;
    }
    const run = async () => {
      const { dir, rate } = filmMove(pos(), target, duration, holds.length);
      el.dataset.dir = String(dir);
      if (dir === 0) {
        f.pause();
        r.pause();
        return;
      }
      const want: 'f' | 'r' = dir > 0 ? 'f' : 'r';
      const v = want === 'f' ? f : r;
      const other = want === 'f' ? r : f;
      if (shown.current !== want) {
        // turn around: the other file at the mirrored position, shown once its frame is there
        const at = duration - (shown.current === 'f' ? f.currentTime : r.currentTime);
        other.pause();
        await seekTo(v, Math.max(0, Math.min(duration, at)));
        if (!alive()) return;
        show(want);
      }
      const end = want === 'f' ? target : duration - target;
      v.playbackRate = rate;
      running.current = true;
      try {
        await v.play();
      } catch {
        running.current = false;
        if (alive()) cb.current.onFail();
        return;
      }
      let stopAt = 0;
      const stop = () => {
        if (!alive()) return;
        running.current = false;
        v.pause();
        // a frame callback can come late (Safari): never stand past the hold
        if (Math.abs(v.currentTime - end) > 0.04) v.currentTime = end;
        el.dataset.pos = target.toFixed(2);
        el.dataset.dir = '0';
      };
      const tick = (t: number) => {
        if (!alive()) return;
        el.dataset.pos = (want === 'f' ? t : duration - t).toFixed(2);
        if (t >= end - ARRIVED || v.ended) return stop();
        // the last stretch: pause on a timer at the very moment the hold comes up
        const leftMs = ((end - t) / rate) * 1000;
        if (leftMs < 150 && !stopAt) stopAt = window.setTimeout(stop, Math.max(0, leftMs - 8));
        watch();
      };
      const watch = () => {
        if (v.requestVideoFrameCallback)
          v.requestVideoFrameCallback((_, meta) => tick(meta.mediaTime));
        else requestAnimationFrame(() => tick(v.currentTime));
      };
      watch();
    };
    void run();
  }, [chapter, duration, holds]);

  return (
    <div className="scrub__film" ref={box} data-pos="0">
      <video
        ref={fwd}
        className="scrub__video"
        src={src}
        poster={poster}
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
        data-on=""
      />
      <video
        ref={bwd}
        className="scrub__video"
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
      />
    </div>
  );
};
