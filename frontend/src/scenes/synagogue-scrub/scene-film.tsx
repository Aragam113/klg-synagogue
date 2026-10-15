import { useEffect, useRef } from 'react';

import { filmChapterOf, filmRate, filmStallMs, filmTarget } from './scrub-model';

export interface SceneFilmProps {
  /** forward and reversed film (the same segment, object URLs of the downloaded files), `duration` seconds */
  src: string;
  rev: string;
  /** the same films by their http URLs: a player that cannot open an object URL plays these (from the HTTP cache) */
  srcHttp: string;
  revHttp: string;
  duration: number;
  /** chapter holds, seconds of the forward film */
  holds: number[];
  /** the pinned progress where the scroll is now (raw, not eased) */
  progress: () => number;
  /** both films decoded at the scroll's spot, a frame on screen — the frame fallback may go */
  onReady: () => void;
  /** the film cannot be trusted to move (play() refused, no new frame ~300 ms after being told to move, a seek or the
   *  warm-up hanging, a media error): the scene drops to frames; `why` — for the ?debug=scene overlay */
  onFail: (why: string) => void;
  /** the chapter at the camera (filmChapterOf) changed: its text goes on screen */
  onChapter: (k: number) => void;
}

type Video = HTMLVideoElement;
/** requestVideoFrameCallback where the browser has it (Chrome, Safari 15.4+). */
const hasRvfc = (v: Video) =>
  typeof (v as { requestVideoFrameCallback?: unknown }).requestVideoFrameCallback === 'function';

/** The scroll stands still this long → its pace counts as 0 (the camera just closes the lag). */
const REST_MS = 80;
/** The last stretch of a lag is closed in about this long (s): the rate brakes to |lag| / BRAKE_S + the scroll's pace,
 *  so a fast catch-up lands on the target instead of overshooting it and turning back (ping-pong). */
const BRAKE_S = 0.15;
/** Scroll pace (film s/s) is an average over about this long. */
const PACE_MS = 120;
/** Pace: per-frame film travel counted at most (s), and the faster fall-off when the scroll stands (ms). */
const PACE_STEP_S = 0.4;
const PACE_STILL_MS = 120;
/** A lag past this (film seconds) is closed by a jump with a short crossfade instead of a long chase. */
const JUMP_S = 1.5;
/** …landing this far behind the target, so the camera still moves into it. */
const JUMP_LEAD_S = 0.3;
const JUMP_GAP_MS = 400;
/** Closer than this (film s) with the scroll still → stand. */
const AT_S = 0.03;
/** Turn the other way only when the scroll itself goes back (pace past TURN_PACE film s/s) or the camera overshot by
 *  more than TURN_LAG s; a smaller overshoot just stands during a gesture (a turn for a few frames reads as jitter)
 *  and is corrected once the scroll rests. */
const TURN_PACE = 0.2;
const TURN_LAG = 0.25;
/** playbackRate in steps of 1/4 (a rate change per frame stutters in some players), at least 1/4. */
const RATE_STEP = 0.25;
/** A finger down: the shown film already plays this slowly (a 16th — the camera does not visibly move), so the first
 *  pixels of the gesture only change the rate of a running player instead of starting one (~80 ms on a phone). */
const PRIMED_RATE = 0.0625;
/** playbackRate changes: at least this big, at most this often. */
const RATE_JUMP = 0.5;
const RATE_MS = 150;
/** The hidden film is kept at the mirrored spot this often, so turning around needs (almost) no seek. */
const SYNC_MS = 350;
/** Watchdog: a seek (turn, jump) hanging this long, or the warm-up not done in WARM_MAX_MS → frames. */
const BUSY_MAX_MS = 1500;
const WARM_MAX_MS = 8000;

/** While a gesture moves the camera it plays at least at 1× — slower, the next frame (1/25 s of film) would come too
 *  late to answer the finger (at 1/4× — 160 ms); an overshoot is stood out. At rest the closing can be gentle. */
const MOVE_MIN_RATE = 1;
const quant = (r: number, min = RATE_STEP) =>
  Math.max(min, Math.round(Math.abs(r) / RATE_STEP) * RATE_STEP);
const seekTo = (v: Video, t: number) =>
  new Promise<void>((done) => {
    if (Math.abs(v.currentTime - t) < 0.02 && !v.seeking) return done();
    v.addEventListener('seeked', () => done(), { once: true });
    v.currentTime = t;
  });
/** First frame decodable; an object URL the player refuses is swapped for the http one once. */
const loaded = (v: Video, http: string) =>
  new Promise<void>((done, fail) => {
    if (v.readyState >= 2) return done();
    const ok = () => {
      v.removeEventListener('error', bad);
      done();
    };
    const bad = () => {
      if (v.src.startsWith('blob:') && http) {
        v.src = http;
        v.load();
        return;
      }
      v.removeEventListener('loadeddata', ok);
      v.removeEventListener('error', bad);
      fail(new Error('film'));
    };
    v.addEventListener('loadeddata', ok, { once: true });
    v.addEventListener('error', bad);
  });
/** The next presented frame (rVFC), or a short timer (no rVFC, or a paused film that presents nothing new). */
const nextFrame = (v: Video, maxMs = 150) =>
  new Promise<void>((done) => {
    const t = setTimeout(done, hasRvfc(v) ? maxMs : 40);
    if (hasRvfc(v))
      v.requestVideoFrameCallback(() => {
        clearTimeout(t);
        done();
      });
  });

/**
 * Phone scene, film (?s=2): the camera follows the scroll by PLAYING the film, never by seeking it frame by frame.
 * Every rAF the target is where the scroll points (filmTarget of the raw progress — the first pixels of a gesture
 * already move it); the playback rate is the scroll's pace plus a catch-up on the lag (filmRate, ±6×, quarter steps):
 * the hardware decoder and the browser's own frame pacing keep the motion smooth. Scrolling back plays the reversed
 * file from the mirrored spot (the hidden film is kept there every SYNC_MS, so the turn needs almost no seek; it is
 * shown on its first presented frame — never a blank one). A lag past JUMP_S (a fling) jumps near the target under a
 * short crossfade from a snapshot. At rest the camera stands where the scroll points — on the chapter hold once the
 * page settles on a chapter stop; the chapter text follows the camera (onChapter). Both films come as object URLs (downloaded whole) and are warmed up (decoded at the spot) before
 * onReady. Container: `data-pos`, `data-target` (film seconds), `data-rate` (signed playbackRate, 0 — standing).
 */
export const SceneFilm = ({
  src,
  rev,
  srcHttp,
  revHttp,
  duration,
  holds,
  progress,
  onReady,
  onFail,
  onChapter,
}: SceneFilmProps) => {
  const box = useRef<HTMLDivElement>(null);
  const fwd = useRef<Video>(null);
  const bwd = useRef<Video>(null);
  const snap = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onReady, onFail, onChapter, progress, http: [srcHttp, revHttp] });
  cb.current = { onReady, onFail, onChapter, progress, http: [srcHttp, revHttp] };

  useEffect(() => {
    const f = fwd.current;
    const r = bwd.current;
    const el = box.current;
    const shot = snap.current;
    if (!f || !r || !el || !shot) return undefined;
    const T = duration;
    let gone = false;
    let raf = 0;
    let ready = false;
    let shown: 'f' | 'r' = 'f';
    let busy = false;
    let lastT = 0;
    let lastRaw = -1;
    let pace = 0;
    /** the scroll's direction over the last two frames (±1; 0 — not moving): a turn needs no averaging */
    let dirNow = 0;
    let lastDir = 0;
    let movedAt = 0;
    let lastJump = -1e9;
    let rateAt = 0;
    let syncAt = 0;
    let chapter = -1;
    let near = true;
    /** standing on the hold with the scroll still since… (the loop sleeps then; a scroll wakes it) */
    let stillAt = 0;
    let finger = false;
    /** watchdog: since when the shown film is told to move with no new frame, its currentTime then, the last
     *  presented frame of each film (rVFC), since when a seek is busy */
    let wantAt = 0;
    let wantCt = -1;
    const frameAt = { f: 0, r: 0 };
    let busyAt = 0;
    let failed = false;
    const fail = (why: string) => {
      if (gone || failed) return;
      failed = true;
      el.dataset.fail = why;
      f.pause();
      r.pause();
      cb.current.onFail(why);
    };
    // autoplay policies read the attributes (React sets only the muted property): muted + inline, set before any play
    for (const v of [f, r]) {
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
    }
    const watchFrames = (w: 'f' | 'r') => {
      const v = w === 'f' ? f : r;
      if (!hasRvfc(v)) return;
      const on = () => {
        if (gone) return;
        frameAt[w] = performance.now();
        v.requestVideoFrameCallback(on);
      };
      v.requestVideoFrameCallback(on);
    };
    watchFrames('f');
    watchFrames('r');
    const vid = (w: 'f' | 'r') => (w === 'f' ? f : r);
    const pos = () => (shown === 'f' ? f.currentTime : T - r.currentTime);
    const local = (w: 'f' | 'r', t: number) => Math.max(0, Math.min(T, w === 'f' ? t : T - t));
    const show = (w: 'f' | 'r') => {
      shown = w;
      f.toggleAttribute('data-on', w === 'f');
      r.toggleAttribute('data-on', w === 'r');
    };
    const play = (v: Video) => {
      if (!v.paused) return;
      v.play().catch((err: unknown) => {
        const name = (err as { name?: string } | null)?.name ?? 'Error';
        v.dataset.playErr = name;
        // AbortError — our own pause() came before the play started: not a failure
        if (name !== 'AbortError') fail(`play:${name}`);
      });
    };

    /** Turn around: the other film at the mirrored spot, shown on its first frame, then it plays. */
    const turn = async (w: 'f' | 'r', rate: number) => {
      busy = true;
      busyAt = performance.now();
      const v = vid(w);
      const old = vid(shown);
      const at = local(w, pos());
      // the old film stands on its frame while the other one gets there; one already running near the spot (primed
      // by the finger) is not seeked at all — it is shown on its next frame
      old.pause();
      if (v.paused || Math.abs(v.currentTime - at) > 0.15) await seekTo(v, at);
      if (gone) return;
      v.playbackRate = quant(rate, MOVE_MIN_RATE);
      play(v);
      await nextFrame(v);
      if (gone) return;
      show(w);
      old.pause();
      busy = false;
    };

    /** A long lag: freeze the current frame on a canvas, jump the film near the target, fade the snapshot out. */
    const jump = async (to: number) => {
      busy = true;
      busyAt = performance.now();
      const v = vid(shown);
      try {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (shot.width !== w || shot.height !== h) {
          shot.width = w;
          shot.height = h;
        }
        const ctx = shot.getContext('2d');
        if (ctx && v.videoWidth) {
          const k = Math.max(w / v.videoWidth, h / v.videoHeight);
          ctx.drawImage(
            v,
            (w - v.videoWidth * k) / 2,
            (h - v.videoHeight * k) / 2,
            v.videoWidth * k,
            v.videoHeight * k
          );
          shot.dataset.on = '';
        }
      } catch {
        // a snapshot is only cosmetics
      }
      await seekTo(v, local(shown, to));
      await nextFrame(v);
      if (gone) return;
      delete shot.dataset.on;
      busy = false;
    };

    const tick = (t: number) => {
      raf = 0;
      if (gone) return;
      const dt = lastT ? Math.min(100, t - lastT) : 16.7;
      lastT = t;
      const raw = filmTarget(cb.current.progress(), holds);
      if (lastRaw < 0) lastRaw = raw;
      if (raw !== lastRaw) movedAt = t;
      const dRaw = Math.sign(raw - lastRaw);
      dirNow = dRaw === 0 ? 0 : dRaw === lastDir ? dRaw : dirNow;
      lastDir = dRaw;
      // the scroll's pace in film s/s: a jump of the page (a link, scrollTo) is not a pace — at most PACE_STEP_S per
      // frame counts; a still frame lets it fall fast (no stale pace pushing the camera past the target)
      const step = Math.max(-PACE_STEP_S, Math.min(PACE_STEP_S, raw - lastRaw));
      pace +=
        (step / (dt / 1000) - pace) * Math.min(1, dt / (step === 0 ? PACE_STILL_MS : PACE_MS));
      lastRaw = raw;
      // the camera goes where the scroll points; at rest that is a chapter hold whenever the page rests on a chapter
      // stop (the engine's auto-settle glides there between chapters)
      const resting = t - movedAt > REST_MS;
      const target = raw;
      const v = resting ? 0 : pace;
      const at = pos();
      const e = target - at;
      const k = filmChapterOf(at, holds);
      if (k !== chapter) {
        chapter = k;
        cb.current.onChapter(k);
      }
      el.dataset.pos = at.toFixed(2);
      el.dataset.target = target.toFixed(2);
      if (!busy) {
        const cur = vid(shown);
        const free = filmRate(e, v);
        // braking once the scroll stands: never faster than closing the lag in BRAKE_S
        const rate =
          resting && Math.sign(free) === Math.sign(e)
            ? Math.sign(free) * Math.min(Math.abs(free), Math.abs(e) / BRAKE_S + Math.abs(v))
            : free;
        /** stand: while a gesture is on (finger or scroll moving) idle-play at a 16th — a pause / play cycle would
         *  restart the player (a ~80 ms gap) on every small overshoot; at rest really pause */
        const stand = () => {
          el.dataset.rate = '0';
          if ((finger || !resting) && cur.currentTime < T - 0.05) {
            if (cur.playbackRate !== PRIMED_RATE) cur.playbackRate = PRIMED_RATE;
            play(cur);
          } else {
            cur.pause();
            if (!stillAt) stillAt = t;
          }
        };
        if (Math.abs(e) > JUMP_S && t - lastJump > JUMP_GAP_MS) {
          lastJump = t;
          void jump(target - Math.sign(e) * JUMP_LEAD_S);
        } else if (
          Math.abs(e) < AT_S &&
          Math.abs(v) < 0.05 &&
          // a finger turning the scroll back does not wait for a whole frame of lag: the turn starts at once
          !(
            finger &&
            dirNow !== 0 &&
            dirNow !== (shown === 'f' ? 1 : -1) &&
            Math.sign(e) === dirNow
          )
        ) {
          stand();
        } else {
          stillAt = 0;
          const w: 'f' | 'r' = rate > 0 ? 'f' : 'r';
          if (w !== shown) {
            if (
              dirNow === Math.sign(rate) ||
              (Math.sign(v) === Math.sign(rate)
                ? Math.abs(v) > TURN_PACE
                : Math.abs(e) > (resting && !finger ? 2 * AT_S : TURN_LAG))
            ) {
              el.dataset.rate = String(rate);
              void turn(w, rate);
            } else stand();
          } else if (cur.currentTime >= T - 0.05) {
            // the end of this file (the film's end forward, its start backward): stand — a play() here would restart it
            cur.pause();
            el.dataset.rate = '0';
          } else if (rate !== 0) {
            const q = quant(rate, finger || !resting ? MOVE_MIN_RATE : RATE_STEP);
            // a rate change costs the player a hiccup: only a clear one, at most every RATE_MS
            const primed = cur.playbackRate === PRIMED_RATE;
            // slowing down is held back less (it is what stops an overshoot)
            const slower = q <= cur.playbackRate - RATE_STEP && t - rateAt > 60;
            if (
              primed ||
              slower ||
              (Math.abs(q - cur.playbackRate) >= RATE_JUMP && t - rateAt > RATE_MS)
            ) {
              cur.playbackRate = q;
              rateAt = t;
            }
            play(cur);
            el.dataset.rate = String(Math.sign(rate) * q);
          }
        }
        // keep the hidden film at the mirrored spot: a turn then starts at once
        const other = vid(shown === 'f' ? 'r' : 'f');
        // only while the shown one stands: a seek next to a playing film costs it frames (decoder contention)
        if (!busy && cur.paused && t - syncAt > SYNC_MS && !other.seeking && other.paused) {
          syncAt = t;
          const want = local(shown === 'f' ? 'r' : 'f', at);
          if (Math.abs(other.currentTime - want) > 0.1) other.currentTime = want;
        }
      }
      // watchdog: told to move (not standing, not idling at a 16th) and no new frame for filmStallMs → frames
      if (busy) {
        if (t - busyAt > BUSY_MAX_MS) fail('seek');
      } else {
        const limit = filmStallMs(Number(el.dataset.rate) || 0);
        if (limit === Infinity) wantAt = 0;
        else {
          const cur = vid(shown);
          const ct = cur.currentTime;
          const moved = hasRvfc(cur) ? frameAt[shown] > wantAt : ct !== wantCt;
          if (!wantAt || moved) {
            wantAt = t;
            wantCt = ct;
          } else if (t - wantAt > limit) fail(`stall rs=${cur.readyState}`);
        }
      }
      if (failed) return;
      // asleep when far from the screen, or standing on the hold with the scroll still for half a second
      const asleep = (!near || (stillAt && t - stillAt > 500)) && f.paused && r.paused && !busy;
      if (!asleep) raf = requestAnimationFrame(tick);
    };
    const run = () => {
      stillAt = 0;
      if (!raf) wantAt = 0;
      if (!raf && ready && !gone) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      if (near) run();
    };
    const onDown = (ev: Event) => {
      finger = true;
      onScroll();
      // prime the players at once (not on the next frame): whichever way the gesture goes, the film for it is already
      // running at a 16th — the first pixels only change its rate (a film at its own end is left alone: it can only
      // be needed the other way)
      if (!ready || !near || busy || (ev as TouchEvent).touches?.length === 2) return;
      const at = pos();
      for (const w of ['f', 'r'] as const) {
        const v = vid(w);
        const want = local(w, at);
        if (!v.paused || v.seeking || want >= T - 0.05) continue;
        if (w !== shown && Math.abs(v.currentTime - want) > 0.05) v.currentTime = want;
        v.playbackRate = PRIMED_RATE;
        play(v);
      }
    };
    const onUp = (ev: Event) => {
      if ((ev as TouchEvent).touches?.length) return;
      finger = false;
      // the hidden one stops idling (it is kept at the mirrored spot again once the camera stands)
      if (!busy) vid(shown === 'f' ? 'r' : 'f').pause();
      onScroll();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onDown, { passive: true, capture: true });
    window.addEventListener('touchend', onUp, { passive: true, capture: true });
    window.addEventListener('touchcancel', onUp, { passive: true, capture: true });

    // the film plays only while the scene is near the screen
    const io =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (list) => {
              near = list.some((x) => x.isIntersecting);
              if (near) run();
              else {
                f.pause();
                r.pause();
              }
            },
            { rootMargin: '50% 0px 50% 0px' }
          )
        : null;
    io?.observe(el);

    // warm-up: both films decoded at the scroll's spot (a muted play + pause), then ready
    (async () => {
      try {
        await Promise.all([loaded(f, cb.current.http[0]), loaded(r, cb.current.http[1])]);
        const at = filmTarget(cb.current.progress(), holds);
        // warm each decoder away from the file's very end (a play there just ends — or restarts it at 0)
        const inside = (t: number) => Math.min(T - 0.2, Math.max(0.05, t));
        await Promise.all([seekTo(f, inside(local('f', at))), seekTo(r, inside(local('r', at)))]);
        for (const v of [f, r]) {
          // a refused warm-up play is not final (the in-use play() decides); an AbortError is our own pause
          await Promise.race([
            v.play().catch(() => undefined),
            new Promise((ok) => setTimeout(ok, 600)),
          ]);
          v.pause();
        }
        await Promise.all([seekTo(f, local('f', at)), seekTo(r, local('r', at))]);
        await nextFrame(f).catch(() => undefined);
        if (gone) return;
        show('f');
        ready = true;
        cb.current.onReady();
        run();
      } catch {
        fail('load');
      }
    })();
    const warm = setTimeout(() => {
      if (!ready) fail('warmup');
    }, WARM_MAX_MS);
    const onError = (ev: Event) => {
      const v = ev.target as Video;
      if (ready) fail(`error:${v.error?.code ?? '?'}`);
    };
    f.addEventListener('error', onError);
    r.addEventListener('error', onError);

    return () => {
      gone = true;
      clearTimeout(warm);
      f.removeEventListener('error', onError);
      r.removeEventListener('error', onError);
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onDown, { capture: true });
      window.removeEventListener('touchend', onUp, { capture: true });
      window.removeEventListener('touchcancel', onUp, { capture: true });
      io?.disconnect();
      f.pause();
      r.pause();
    };
  }, [src, rev, duration, holds]);

  return (
    <div className="scrub__film" ref={box} data-pos="0">
      <video
        ref={fwd}
        data-file={srcHttp.split('/').pop()}
        className="scrub__video"
        src={src}
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
      />
      <video
        ref={bwd}
        data-file={revHttp.split('/').pop()}
        className="scrub__video"
        src={rev}
        muted
        playsInline
        preload="auto"
        disableRemotePlayback
      />
      <canvas ref={snap} className="scrub__snap" aria-hidden />
    </div>
  );
};
