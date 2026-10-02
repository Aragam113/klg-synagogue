/**
 * Phone scroll bench for the touch variants of the motion engine (`/?a=1|2|3`).
 *
 *   node e2e/mscroll-bench.mjs [1 2 3 | base]      (WEB_URL=http://localhost:8150 by default)
 *
 * Emulates a real phone: 390×844, isMobile + hasTouch, CPU throttling ×4, «Fast 3G» for the first load.
 * Scrolls through the synagogue scene with touch flings (CDP synthesizeScrollGesture, inertia on) and samples
 * every rAF: scrollY, the scene's `--p` and the canvas frame. Prints one JSON line per variant and saves
 * e2e/shots/mscroll_a<N>_*.png.
 *
 * Metrics (all over the frames the page actually moved):
 *   loadS     seconds until the scene's frame set is fully loaded on Fast 3G (null — not done in 40 s)
 *   pHz       --p writes per second while scrolling (or playing, a=3)
 *   frameHz   scene frame changes per second
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
const VARIANTS = process.argv.slice(2).length ? process.argv.slice(2) : ['1', '2', '3'];
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
      s.rows.push([t, scrollY, sc ? sc.style.getPropertyValue('--p') : '', c ? c.dataset.frame ?? '' : '', innerHeight]);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

const summarize = (rows, mode) => {
  let moved = 0, pw = 0, fw = 0, missed = 0, jerks = 0;
  for (let i = 1; i < rows.length; i++) {
    const [, y0, p0, f0] = rows[i - 1];
    const [, y1, p1, f1] = rows[i];
    const live = mode === 'time' ? p0 !== p1 || f0 !== f1 : y0 !== y1;
    if (!live) continue;
    moved++;
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
    missed: moved ? +((100 * missed) / moved).toFixed(1) : 0,
    jerks,
  };
};

const runVariant = async (v) => {
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
  const q = v === 'base' ? '' : `&a=${v}`;
  const t0 = Date.now();
  await page.goto(`${WEB}/?lang=ru${q}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForSelector('.scrub', { timeout: 180000 });
  const tag = v === 'base' ? 'base' : `a${v}`;
  const variant = await page.evaluate(() => document.documentElement.dataset.touch ?? 'native');
  // scroll to the scene at once (the visitor does not wait for all frames) and measure until the set is in
  await page.evaluate(() => {
    const s = document.querySelector('.scrub');
    window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 200);
  });
  const loadStart = Date.now();
  let loadS = null;
  // frames loaded = canvas has the full set (data-loaded) or all Image requests finished
  for (let i = 0; i < 80; i++) {
    const done = await page.evaluate(() => {
      const n = +(document.querySelector('.scrub canvas')?.dataset.frames ?? 0);
      const got = performance.getEntriesByType('resource').filter((e) => /frame-\d+\.webp/.test(e.name)).length;
      return n > 0 && got >= n;
    });
    if (done) {
      loadS = +((Date.now() - loadStart) / 1000).toFixed(1);
      break;
    }
    await sleep(500);
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
  let mode = 'scroll';
  if (variant === '3') {
    mode = 'time';
    await sleep(9000);
  } else {
    // finger flicks: quick touchMoves then lift — Chrome continues with a fling (inertia), as on a phone
    for (const step of [22, 30, 18, -26, 34]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 420 }] });
      for (let i = 1; i <= 6; i++)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 420 - i * step }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(1100);
    }
  }
  const rows = await page.evaluate(() => { window.__mb.on = false; return window.__mb.rows; });
  const stats = summarize(rows, mode);
  await page.screenshot({ path: join(SHOTS, `mscroll_${tag}_scene.png`) });
  // address bar: viewport height +56px at a fixed scrollY (mid-scene)
  let barJump = null;
  if (variant !== '3') {
    await page.evaluate((s) => window.scrollTo(0, s.top + (s.h - innerHeight) * 0.5), sceneTop);
    await sleep(500);
    const p1 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await sleep(700);
    const p2 = await page.evaluate(() => +document.querySelector('.scrub').style.getPropertyValue('--p'));
    barJump = +Math.abs(p2 - p1).toFixed(4);
    await page.screenshot({ path: join(SHOTS, `mscroll_${tag}_bar.png`) });
  }
  console.log(JSON.stringify({ variant: tag, engine: variant, loadS, ...stats, barJump, totalS: +((Date.now() - t0) / 1000).toFixed(0) }));
  await page.close();
};

try {
  for (const v of VARIANTS) await runVariant(v);
} finally {
  await browser.close();
}
