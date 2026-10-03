/**
 * Phone scroll bench for the touch path of the motion engine (html[data-touch]).
 *
 *   npm run bench:mobile [-- <tag>] [--fast]   (WEB_URL=http://localhost:8150 by default; tag names the run, default m3)
 *
 * Emulates a phone: 390×844, isMobile + hasTouch; by default a slow one — CPU throttling ×4 and «Fast 3G» for the
 * first load; `--fast` — a fast phone (no CPU throttling, unthrottled network). Scrolls the synagogue scene with
 * touch flings (CDP touch events, Chrome adds inertia) and slow drags, sampling every rAF: scrollY, finger, the
 * scene's `--p`, the shown frame, its blend pair/alpha and repaint count. Prints one JSON line, saves
 * e2e/shots/mscroll_<tag>_*.png.
 *
 * The scene media is `.scrub [data-frames]` (canvas of frames or the scrub video): `data-frame` = frame on screen,
 * `data-pair` = "a-b" frames crossfaded (canvas), `data-blend` = alpha. Wanted frame = round(--p·(N−1)).
 *
 * Metrics (over the rAFs the page actually moved, unless said otherwise):
 *   media     what the scene shows on the phone: video | frames
 *   firstS    seconds until the scene scrubs (data-pass) after scrolling to it, on the first load
 *   loadS     seconds until the scene's media is in (data-loaded: "all" frames / video fully buffered, or "enough" —
 *             the video can play through and the browser paused its preload; null — not in 90 s)
 *   pHz / frameHz / drawHz   --p writes / shown-frame changes / canvas repaints per second while moving
 *   blend     % of moving rAFs showing two frames crossfaded
 *   farBlend  % of moving rAFs crossfading frames that are NOT neighbours (|a−b| > 1) — the «double image»
 *   stalls    times the page moved but the shown frame stayed the same > 100 ms while another frame was wanted
 *   stallMs   longest such freeze
 *   settleMs  mean / max ms from the page coming to rest until the shown frame is the wanted one
 *   early     the same stall/farBlend metrics for flings made while the media is still loading (slow phone)
 *   snaps     auto-settle glides seen (movement starting with the finger up after ≥ 100 ms of rest)
 *   backSnap  glides against the direction of the last movement longer than 5% of the viewport
 *   backPx    longest such glide, px
 *   missed    % of moving rAFs where --p stayed still;  jerks — shown frame jumps > 4 frames in one rAF
 *   barJump   |Δ--p| when the viewport height changes by 56px (address bar) at a fixed scrollY
 *   uniform   a slow even drag (~200 px/s, finger down the whole time, after the media is in):
 *             picHz   picture changes per second on screen (data-frame from requestVideoFrameCallback / canvas)
 *             maxSrc  largest jump between two pictures shown one after another, in frames of the SOURCE film
 *                     (25 fps: a 10 fps scene video jumps ≥ 2.5 source frames at every step)
 *             p95Src  95th percentile of that jump
 *             lagMs   mean / max ms from the scroll position asking for a frame until that frame is on screen
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8150';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SMOKE_SHOTS ?? join(ROOT, 'e2e', 'shots');
const ARGS = process.argv.slice(2);
/** Frame rate of the source film the scene video is cut from (kldsynagogue film 2017). */
const SRC_FPS = 25;
const FAST = ARGS.includes('--fast');
const TAG = ARGS.find((a) => !a.startsWith('--')) ?? 'm3';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 };
const OPEN = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--enable-gpu-rasterization', '--autoplay-policy=no-user-gesture-required'],
});

const sampler = () => {
  const s = (window.__mb = { on: false, rows: [], finger: 0 });
  addEventListener('touchstart', () => (s.finger = 1), { capture: true, passive: true });
  addEventListener('touchend', () => (s.finger = 0), { capture: true, passive: true });
  const loop = (t) => {
    if (s.on) {
      const sc = document.querySelector('.scrub');
      const c = document.querySelector('.scrub [data-frames]');
      const d = c?.dataset ?? {};
      // [t, y, p, frame, vh, alpha, draws, pair, frames, finger]
      s.rows.push([t, scrollY, sc ? sc.style.getPropertyValue('--p') : '', d.frame ?? '', innerHeight, +(d.blend ?? 0), +(d.draws ?? 0), d.pair ?? '', +(d.frames ?? 0), s.finger]);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const wanted = (r) => Math.round(Math.min(1, Math.max(0, +r[2] || 0)) * Math.max(0, r[8] - 1));
const isFar = (r) => {
  const [a, b] = String(r[7]).split('-').map(Number);
  return r[5] > 0 && r[5] < 1 && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1;
};

const summarize = (rows) => {
  let moved = 0, pw = 0, fw = 0, missed = 0, jerks = 0, blended = 0, far = 0, draws = 0;
  let stalls = 0, stallMs = 0, changedAt = rows[0]?.[0] ?? 0, counted = false;
  for (let i = 1; i < rows.length; i++) {
    const r0 = rows[i - 1];
    const r1 = rows[i];
    if (r0[3] !== r1[3]) {
      changedAt = r1[0];
      counted = false;
    }
    if (r0[1] === r1[1]) continue;
    moved++;
    if (r1[5] > 0 && r1[5] < 1) blended++;
    if (isFar(r1)) far++;
    draws += Math.max(0, r1[6] - r0[6]);
    if (r0[2] !== r1[2]) pw++;
    else missed++;
    if (r0[3] !== r1[3]) fw++;
    if (r0[3] !== '' && r1[3] !== '' && Math.abs(+r1[3] - +r0[3]) > 4) jerks++;
    // frozen: moving, frame unchanged > 100 ms although another frame is wanted
    const frozen = r1[0] - changedAt;
    if (r1[3] !== '' && frozen > 100 && wanted(r1) !== +r1[3]) {
      stallMs = Math.max(stallMs, frozen);
      if (!counted) stalls++;
      counted = true;
    }
  }
  // settle: from the last movement until the shown frame equals the wanted one (rests ≥ 300 ms)
  const settle = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] !== rows[i - 1][1]) continue;
    if (i + 1 < rows.length && rows[i + 1][1] !== rows[i][1]) continue;
    // i = first still row after a move? walk back to make sure the previous row moved
    if (i < 2 || rows[i - 1][1] === rows[i - 2][1]) continue;
    let j = i;
    while (j + 1 < rows.length && rows[j + 1][1] === rows[i][1]) j++;
    if (rows[j][0] - rows[i][0] < 300) continue;
    const want = wanted(rows[j]);
    let k = i;
    while (k <= j && +rows[k][3] !== want) k++;
    settle.push(k <= j ? rows[k][0] - rows[i - 1][0] : rows[j][0] - rows[i - 1][0]);
  }
  // glides: movement with the finger up that starts after ≥ 100 ms of rest
  let snaps = 0, backSnap = 0, backPx = 0, lastDir = 0, restFrom = rows[0]?.[0] ?? 0;
  for (let i = 1; i < rows.length; i++) {
    const dy = rows[i][1] - rows[i - 1][1];
    if (!dy) continue;
    const rest = rows[i - 1][0] - restFrom;
    if (rest >= 100 && !rows[i][9] && !rows[i - 1][9]) {
      let j = i;
      while (j + 1 < rows.length && rows[j + 1][1] !== rows[j][1] && !rows[j + 1][9]) j++;
      const dist = rows[j][1] - rows[i - 1][1];
      snaps++;
      if (lastDir && Math.sign(dist) === -lastDir && Math.abs(dist) > 0.05 * rows[i][4]) {
        backSnap++;
        backPx = Math.max(backPx, Math.abs(dist));
      }
      restFrom = rows[j][0];
      i = j;
      continue;
    }
    lastDir = Math.sign(dy);
    restFrom = rows[i][0];
  }
  const secs = rows.length > 1 ? (rows.at(-1)[0] - rows[0][0]) / 1000 : 1;
  const liveSecs = (moved / Math.max(1, rows.length - 1)) * secs;
  const pct = (x) => (moved ? +((100 * x) / moved).toFixed(1) : 0);
  return {
    rafHz: +((rows.length - 1) / secs).toFixed(1),
    pHz: +(pw / Math.max(0.01, liveSecs)).toFixed(1),
    frameHz: +(fw / Math.max(0.01, liveSecs)).toFixed(1),
    drawHz: +(draws / Math.max(0.01, liveSecs)).toFixed(1),
    blend: pct(blended),
    farBlend: pct(far),
    stalls,
    stallMs: Math.round(stallMs),
    settleMs: settle.length ? [Math.round(settle.reduce((a, b) => a + b, 0) / settle.length), Math.round(Math.max(...settle))] : null,
    snaps,
    backSnap,
    backPx: Math.round(backPx),
    missed: pct(missed),
    jerks,
  };
};

/** Slow even drag: per-rAF picture changes, the jump between shown pictures, the catch-up lag. */
const uniformStats = (rows, scene, vh, fps) => {
  const span = scene.h - vh;
  const frames = rows[0]?.[8] ?? 0;
  const live = rows.filter((r) => r[9]);
  if (live.length < 10 || !frames) return null;
  const rawWant = (r) => Math.round(Math.min(1, Math.max(0, (r[1] - scene.top) / span)) * (frames - 1));
  let changes = 0, maxStep = 0;
  const steps = [];
  const askedAt = new Map();
  const lags = [];
  for (let i = 1; i < live.length; i++) {
    const w = rawWant(live[i]);
    for (let k = rawWant(live[i - 1]) + 1; k <= w; k++) if (!askedAt.has(k)) askedAt.set(k, live[i][0]);
    const a = +live[i - 1][3];
    const b = +live[i][3];
    if (live[i - 1][3] === '' || live[i][3] === '' || a === b) continue;
    changes++;
    const step = Math.abs(b - a) * (SRC_FPS / fps);
    steps.push(step);
    maxStep = Math.max(maxStep, step);
    for (let k = a + 1; k <= b; k++) if (askedAt.has(k)) lags.push(live[i][0] - askedAt.get(k));
  }
  steps.sort((x, y) => x - y);
  const secs = (live.at(-1)[0] - live[0][0]) / 1000;
  return {
    picHz: +(changes / Math.max(0.01, secs)).toFixed(1),
    maxSrc: +maxStep.toFixed(1),
    p95Src: steps.length ? +steps[Math.floor(steps.length * 0.95)].toFixed(1) : null,
    lagMs: lags.length ? [Math.round(lags.reduce((x, y) => x + y, 0) / lags.length), Math.round(Math.max(...lags))] : null,
  };
};

/** Finger down, an even drag of `dy` px over `ms`, a short hold, finger up. */
const evenDrag = async (cdp, dy, ms) => {
  await touch(cdp, 'touchStart', 760);
  const t0 = Date.now();
  for (;;) {
    const k = Math.min(1, (Date.now() - t0) / ms);
    await touch(cdp, 'touchMove', 760 - dy * k);
    if (k >= 1) break;
    await sleep(16);
  }
  await sleep(400);
  await touch(cdp, 'touchEnd');
};

const touch = (cdp, type, y) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 195, y }] });

/** Quick flick (Chrome continues with inertia), then a pause for the auto-settle glide. */
const fling = async (cdp, step, pause = 1100) => {
  await touch(cdp, 'touchStart', 420);
  for (let i = 1; i <= 6; i++) await touch(cdp, 'touchMove', 420 - i * step);
  await touch(cdp, 'touchEnd');
  await sleep(pause);
};
/** Slow drag of `dy` px, the finger held still for a moment before lifting (no inertia). */
const drag = async (cdp, dy, pause = 1400) => {
  await touch(cdp, 'touchStart', 600);
  const n = 20;
  for (let i = 1; i <= n; i++) {
    await touch(cdp, 'touchMove', 600 - (dy * i) / n);
    await sleep(25);
  }
  await sleep(250);
  await touch(cdp, 'touchEnd');
  await sleep(pause);
};

const record = async (page, fn) => {
  await page.evaluate(() => { window.__mb.rows = []; window.__mb.on = true; });
  await fn();
  return page.evaluate(() => { window.__mb.on = false; return window.__mb.rows; });
};

const run = async () => {
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('synagogue.preloaded', '1');
    localStorage.setItem('synagogue.cookieConsent', '1');
    try { sessionStorage.clear(); } catch { /* */ }
  });
  await page.evaluateOnNewDocument(sampler);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', FAST ? OPEN : FAST_3G);
  if (!FAST) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('.scrub', { timeout: 180000 });
  const engine = await page.evaluate(() => document.documentElement.dataset.touch ?? 'native');
  const sceneTop = await page.evaluate(() => {
    const s = document.querySelector('.scrub');
    return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight };
  });
  // the visitor scrolls to the scene at once (does not wait for the media) — a tap there primes iOS-like video
  await page.evaluate((y) => window.scrollTo(0, y), sceneTop.top);
  const loadStart = Date.now();
  let loadS = null;
  let firstS = null;
  let early = null;
  for (let i = 0; i < 360; i++) {
    const st = await page.evaluate(() => {
      const sc = document.querySelector('.scrub');
      return { done: sc?.dataset.loaded === 'all' || sc?.dataset.loaded === 'enough', first: !!sc?.dataset.pass || sc?.dataset.loaded === 'all' };
    });
    if (st.first && firstS === null) {
      firstS = +((Date.now() - loadStart) / 1000).toFixed(1);
      // flings while the rest is still loading: freezes and the far-frame double image show up here
      if (!st.done && !FAST) {
        const rows = await record(page, async () => {
          for (const step of [26, 30, -24, 34]) await fling(cdp, step, 900);
        });
        const s = summarize(rows);
        early = { stalls: s.stalls, stallMs: s.stallMs, farBlend: s.farBlend, frameHz: s.frameHz };
        await page.evaluate((y) => window.scrollTo(0, y), sceneTop.top);
      }
    }
    if (st.done) {
      loadS = +((Date.now() - loadStart) / 1000).toFixed(1);
      break;
    }
    await sleep(250);
  }
  const media = await page.evaluate(() => document.querySelector('.scrub [data-frames]')?.tagName === 'VIDEO' ? 'video' : 'frames');
  await cdp.send('Network.emulateNetworkConditions', OPEN);
  await page.evaluate((y) => window.scrollTo(0, y), sceneTop.top);
  await sleep(800);
  const rows = await record(page, async () => {
    for (const step of [22, 30, 18, -26, 34]) await fling(cdp, step);
    // slow drags: a short one down (should come back), a longer one down (should go on), one up
    const chapter = (sceneTop.h - 844) / 5;
    await drag(cdp, chapter * 0.15);
    await drag(cdp, chapter * 0.5);
    await drag(cdp, -chapter * 0.5);
  });
  const stats = summarize(rows);
  // slow even scroll through the middle of the scene (~200 px/s), finger down the whole time
  const fps = await page.evaluate(async () => {
    const v = document.querySelector('.scrub video');
    if (!v) return null;
    const m = await fetch(v.currentSrc.replace(/v\/scene\.mp4.*$/,'manifest.json')).then((r) => r.json()).catch(() => null);
    return m?.video?.fps ?? null;
  });
  let uniform = null;
  if (fps) {
    await page.evaluate((s) => window.scrollTo(0, s.top + (s.h - innerHeight) * 0.3), sceneTop);
    await sleep(1600);
    const urows = await record(page, async () => {
      await evenDrag(cdp, 640, 3200);
      await evenDrag(cdp, 640, 3200);
    });
    uniform = uniformStats(urows, sceneTop, 844, fps);
  }
  await page.screenshot({ path: join(SHOTS, `mscroll_${TAG}${FAST ? '_fast' : ''}_scene.png`) });
  // address bar: viewport height +56px at a fixed scrollY (mid-scene)
  let barJump = null;
  {
    await page.evaluate((s) => window.scrollTo(0, s.top + (s.h - innerHeight) * 0.5), sceneTop);
    await sleep(1600); // a possible auto-settle glide ends first
    const p1 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await sleep(700);
    const p2 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    barJump = +Math.abs(p2 - p1).toFixed(4);
  }
  console.log(JSON.stringify({ run: TAG, phone: FAST ? 'fast' : 'slow', engine, media, firstS, loadS, ...stats, early, uniform, barJump, totalS: +((Date.now() - t0) / 1000).toFixed(0) }));
  await page.close();
};

try {
  await run();
} finally {
  await browser.close();
}
