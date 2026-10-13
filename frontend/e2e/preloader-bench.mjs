/**
 * Preloader timing bench: how long the preloader stays on a phone over slow networks, cold and warm cache.
 *
 *   npm run bench:preloader [-- <tag>]   (WEB_URL=http://localhost:8231, WEB_PATH=/klg-synagogue/ — the demo build
 *                                         served by `npm run serve:demo`, which caches like GitHub Pages)
 *
 * A phone (390×844, isMobile + hasTouch, CPU throttling ×4) opens the home page over DevTools «Fast 3G» and
 * «Slow 3G»: cold — a fresh incognito context; warm — the same context reloaded once the scene's frame cache is in.
 * Prints one JSON line per case:
 *   readyS   seconds from navigation start until the preloader leaves (html[data-app-ready]; data-preload-at)
 *   ownS     seconds the preloader itself ran (data-preload-ms, from its mount — the JS bundle comes before it)
 *   scene    share of the scene's frame cache decoded at that moment (data-preload-scene; 1 = all)
 *   sceneS   seconds from navigation start until the whole cache is in (data-loaded="all"; null — not in 120 s)
 */
import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8231';
const PATH = process.env.WEB_PATH ?? '/klg-synagogue/';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TAG = process.argv[2] ?? 'p1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// DevTools presets
const NETS = {
  fast3g: { offline: false, latency: 562.5, downloadThroughput: ((1.6 * 1024 * 1024) / 8) * 0.9, uploadThroughput: ((750 * 1024) / 8) * 0.9 },
  slow3g: { offline: false, latency: 2000, downloadThroughput: ((500 * 1024) / 8) * 0.8, uploadThroughput: ((500 * 1024) / 8) * 0.8 },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });

const measure = async (page) => {
  const t0 = Date.now();
  await page.goto(`${WEB}${PATH}?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true', { timeout: 240000, polling: 100 });
  const r = await page.evaluate(() => {
    const d = document.documentElement.dataset;
    // builds before data-preload-at: the moment html[data-app-ready] was seen (polling 100 ms)
    const at = d.preloadAt ? +d.preloadAt : performance.now();
    return { readyS: +(at / 1000).toFixed(1), ownS: d.preloadMs ? +(+d.preloadMs / 1000).toFixed(1) : null, scene: d.preloadScene ? +d.preloadScene : null };
  });
  let sceneS = null;
  for (let i = 0; i < 480; i++) {
    if (await page.evaluate(() => document.querySelector('.scrub')?.dataset.loaded === 'all')) {
      sceneS = +((Date.now() - t0) / 1000).toFixed(1);
      break;
    }
    await sleep(250);
  }
  return { ...r, sceneS };
};

try {
  for (const [net, cond] of Object.entries(NETS)) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => localStorage.setItem('synagogue.cookieConsent', '1'));
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', cond);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const cold = await measure(page);
    console.log(JSON.stringify({ run: TAG, net, cache: 'cold', ...cold }));
    const warm = await measure(page);
    console.log(JSON.stringify({ run: TAG, net, cache: 'warm', ...warm }));
    await ctx.close();
  }
} finally {
  await browser.close();
}
