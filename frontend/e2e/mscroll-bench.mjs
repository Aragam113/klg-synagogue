/**
 * Phone scroll bench for the touch path of the motion engine (html[data-touch]).
 *
 *   npm run bench:mobile [-- <tag>]      (WEB_URL=http://localhost:8150 by default; tag names the run, default m2)
 *
 * Emulates a real phone: 390×844, isMobile + hasTouch, CPU throttling ×4, «Fast 3G» for the first load.
 * Scrolls through the synagogue scene with touch flings (CDP synthesizeScrollGesture, inertia on) and samples
 * every rAF: scrollY, the scene's `--p`, the canvas frame, its blend alpha and repaint count. Prints one JSON line
 * and saves e2e/shots/mscroll_<tag>_*.png.
 *
 * Metrics (all over the frames the page actually moved):
 *   firstS    seconds until the scene scrubs (phone: the coarse pass, every 4th frame) after scrolling to it
 *   loadS     seconds until the scene's frame set is fully loaded on Fast 3G (null — not done in 90 s)
 *   pHz       --p writes per second while scrolling
 *   frameHz   scene frame changes per second
 *   blend     % of moving rAFs whose canvas shows two frames crossfaded (alpha strictly between 0 and 1)
 *   drawHz    canvas repaints per second while moving
 *   missed    % of rAFs where the page moved but --p stayed still
 *   jerks     frame jumps > 4 frames in one rAF, plus --p jumps after an address-bar resize
 *   barJump   |Δ--p| when the viewport height changes by 56px (address bar) at a fixed scrollY
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8150';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SMOKE_SHOTS ?? join(ROOT, 'e2e', 'shots');
const TAG = process.argv[2] ?? 'm2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const FAST_3G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1024 * 1024) / 8 * 0.9, uploadThroughput: (750 * 1024) / 8 * 0.9 };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--enable-gpu-rasterization'],
});

const sampler = () => {
  const s = (window.__mb = { on: false, rows: [] });
  const loop = (t) => {
    if (s.on) {
      const sc = document.querySelector('.scrub');
      const c = document.querySelector('.scrub canvas');
      s.rows.push([t, scrollY, sc ? sc.style.getPropertyValue('--p') : '', c ? c.dataset.frame ?? '' : '', innerHeight, c ? +(c.dataset.blend ?? 0) : 0, c ? +(c.dataset.draws ?? 0) : 0]);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const summarize = (rows) => {
  let moved = 0, pw = 0, fw = 0, missed = 0, jerks = 0, blended = 0, draws = 0;
  for (let i = 1; i < rows.length; i++) {
    const [, y0, p0, f0, , , d0] = rows[i - 1];
    const [, y1, p1, f1, , b1, d1] = rows[i];
    if (y0 === y1) continue;
    moved++;
    if (b1 > 0 && b1 < 1) blended++;
    draws += Math.max(0, d1 - d0);
    if (p0 !== p1) pw++;
    else missed++;
    if (f0 !== f1) fw++;
    if (f0 !== '' && f1 !== '' && Math.abs(+f1 - +f0) > 4) jerks++;
  }
  const secs = rows.length > 1 ? (rows.at(-1)[0] - rows[0][0]) / 1000 : 1;
  const liveSecs = (moved / Math.max(1, rows.length - 1)) * secs;
  return {
    rafHz: +((rows.length - 1) / secs).toFixed(1),
    pHz: +(pw / Math.max(0.01, liveSecs)).toFixed(1),
    frameHz: +(fw / Math.max(0.01, liveSecs)).toFixed(1),
    drawHz: +(draws / Math.max(0.01, liveSecs)).toFixed(1),
    blend: moved ? +((100 * blended) / moved).toFixed(1) : 0,
    missed: moved ? +((100 * missed) / moved).toFixed(1) : 0,
    jerks,
  };
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
  await cdp.send('Network.emulateNetworkConditions', FAST_3G);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const t0 = Date.now();
  await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('.scrub', { timeout: 180000 });
  const tag = TAG;
  const engine = await page.evaluate(() => document.documentElement.dataset.touch ?? 'native');
  // scroll to the scene at once (the visitor does not wait for all frames) and measure until the set is in
  await page.evaluate(() => {
    const s = document.querySelector('.scrub');
    window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 200);
  });
  const loadStart = Date.now();
  let loadS = null;
  let firstS = null;
  // frames loaded = canvas has the full set (data-loaded) or all Image requests finished
  for (let i = 0; i < 360; i++) {
    const st = await page.evaluate(() => {
      const n = +(document.querySelector('.scrub canvas')?.dataset.frames ?? 0);
      const got = performance.getEntriesByType('resource').filter((e) => /frame-\d+\.webp/.test(e.name)).length;
      const sc = document.querySelector('.scrub');
      return { done: n > 0 && got >= n, first: sc?.dataset.pass === 'coarse' || sc?.dataset.loaded === 'all' };
    });
    if (st.first && firstS === null) firstS = +((Date.now() - loadStart) / 1000).toFixed(1);
    if (st.done) {
      loadS = +((Date.now() - loadStart) / 1000).toFixed(1);
      break;
    }
    await sleep(250);
  }
  // early scroll sample during load (first 40 s already passed or load done): flings down through the scene
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const sceneTop = await page.evaluate(() => {
    const s = document.querySelector('.scrub');
    return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight };
  });
  await page.evaluate((y) => window.scrollTo(0, y), sceneTop.top);
  await sleep(800);
  await page.evaluate(() => { window.__mb.rows = []; window.__mb.on = true; });
  // finger flicks: quick touchMoves then lift — Chrome continues with a fling (inertia), as on a phone; the pauses
  // let the auto-settle glide run (it is part of the movement measured)
  for (const step of [22, 30, 18, -26, 34]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420 }] });
    for (let i = 1; i <= 6; i++)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 420 - i * step }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(1100);
  }
  const rows = await page.evaluate(() => { window.__mb.on = false; return window.__mb.rows; });
  const stats = summarize(rows);
  await page.screenshot({ path: join(SHOTS, `mscroll_${tag}_scene.png`) });
  // address bar: viewport height +56px at a fixed scrollY (mid-scene)
  let barJump = null;
  {
    await page.evaluate((s) => window.scrollTo(0, s.top + (s.h - innerHeight) * 0.5), sceneTop);
    await sleep(1600); // the auto-settle glide (≤ 800 ms) ends first
    const p1 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await sleep(700);
    const p2 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    barJump = +Math.abs(p2 - p1).toFixed(4);
    await page.screenshot({ path: join(SHOTS, `mscroll_${tag}_bar.png`) });
  }
  console.log(JSON.stringify({ run: tag, engine, firstS, loadS, ...stats, barJump, totalS: +((Date.now() - t0) / 1000).toFixed(0) }));
  await page.close();
};

try {
  await run();
} finally {
  await browser.close();
}
