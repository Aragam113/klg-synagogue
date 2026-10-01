/**
 * Smoke of the home page (task 08) in real Chrome.
 *
 *   npm run smoke:home            (WEB_URL=http://localhost:8121 by default; starts Expo there if it is down)
 *
 * Needs the backend on :3000 for live data (the page must survive without it too).
 * Checks: preloader leaves; the scene frame follows the scroll (p≈0.1 ≠ p≈0.9 and back again); all 12 sections;
 * scroll to the bottom without console errors; 390px without horizontal scroll; reduced motion → static scene;
 * ?lang=he → dir=rtl and the scene still renders. Screenshots 1440/390 → e2e/shots/ (SMOKE_SHOTS overrides).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8121';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SMOKE_SHOTS ?? join(ROOT, 'e2e', 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

const SECTIONS = ['#hero', '.scrub', '#welcome', '#today', '#community', '#ledger', '.home-marquee', '#visit', '#events', '#funds', '#news', '#dawn'];

const failures = [];
const check = (ok, what, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${what}${extra ? ` (${extra})` : ''}`);
  if (!ok) failures.push(what);
};

const up = async () => {
  try {
    return (await fetch(WEB)).ok;
  } catch {
    return false;
  }
};
let server = null;
if (!(await up())) {
  console.log(`starting expo web on ${WEB} ...`);
  server = spawn('npx', ['expo', 'start', '--web', '--port', new URL(WEB).port], {
    cwd: ROOT,
    shell: true,
    env: { ...process.env, CI: '1', BROWSER: 'none' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 180 && !(await up()); i++) await sleep(1000);
}
const stopServer = () => {
  if (!server) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill('SIGTERM');
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
});

const open = async (path, width, { reduced = false } = {}) => {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const url = m.location()?.url ?? '';
    // GET /dedications is owned by task 07; a 404 there just hides the ribbon.
    if (url.includes('/dedications')) return;
    errors.push(`${m.text()} ${url}`.trim());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width, height: width > 600 ? 900 : 844, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  // Screenshots are compared with the reference: the cookie notice is accepted beforehand so it does not cover them.
  await page.evaluateOnNewDocument(() => localStorage.setItem('synagogue.cookieConsent', '1'));
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('[data-home="root"]', { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 5000 });
  return { page, errors };
};

const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await sleep(900);
};

/** Scroll position at which the scrub runway is at progress p. */
const sceneY = (page, p) =>
  page.evaluate((q) => {
    const el = document.querySelector('.scrub');
    const top = el.getBoundingClientRect().top + window.scrollY;
    return Math.round(top + q * (el.offsetHeight - window.innerHeight));
  }, p);
const frame = (page) => page.$eval('.scrub canvas', (c) => c.dataset.frame ?? null).catch(() => null);

const walk = async (page, prefix) => {
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => window.innerHeight);
  let n = 0;
  for (let y = 0; y < H; y += step) {
    await scrollTo(page, y);
    if (n % 2 === 0 || y + step >= H || process.env.SMOKE_ALL) await page.screenshot({ path: join(SHOTS, `${prefix}_y${String(y).padStart(5, '0')}.png`) });
    n++;
  }
  await scrollTo(page, H);
  await page.screenshot({ path: join(SHOTS, `${prefix}_bottom.png`) });
};

try {
  // Preloader: one line left → right drawing a Star of David in the middle; frames for the owner, then it leaves.
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('synagogue.cookieConsent', '1'));
    await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('[data-preloader] path', { timeout: 60000 });
    const t0 = Date.now();
    for (const [name, at] of [['start', 250], ['middle', 800], ['star', 1350], ['exit', 1850]]) {
      await sleep(Math.max(0, at - (Date.now() - t0)));
      await page.screenshot({ path: join(SHOTS, `home_loader_${name}.png`) });
    }
    await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 4000 });
    check(Date.now() - t0 < 3200, 'preloader: gone within ~2.5 s + .6 s leave', `${Date.now() - t0} ms`);
    check(await page.evaluate(() => document.documentElement.dataset.appReady === 'true'), 'preloader: html[data-app-ready]');
    await page.close();
  }
  // 390 with touch: the preloader is shown on phones too (only reduced motion / repeat visit skip it).
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => localStorage.setItem('synagogue.cookieConsent', '1'));
    await page.goto(`${WEB}/?lang=ru`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('[data-preloader] path', { timeout: 60000 });
    const t0 = Date.now();
    check(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), '390 touch: coarse pointer emulated');
    await sleep(1300);
    await page.screenshot({ path: join(SHOTS, 'home_loader_390_star.png') });
    await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 4000 });
    check(Date.now() - t0 < 3200, '390 touch: preloader shown and gone', `${Date.now() - t0} ms`);
    check(await page.evaluate(() => document.documentElement.dataset.appReady === 'true'), '390 touch: html[data-app-ready]');
    await page.close();
  }
  // 1440, ru: scene follows the scroll, all sections, no errors to the bottom.
  {
    const { page, errors } = await open('/?lang=ru', 1440);
    await sleep(1800); // hero words rise + lead/buttons fade in
    await page.screenshot({ path: join(SHOTS, 'home_1440_top.png') });
    check(await page.evaluate(() => document.documentElement.dataset.appReady === 'true'), '1440: preloader done, html[data-app-ready]');
    for (const s of SECTIONS) check(!!(await page.$(s)), `1440: section ${s}`);
    check(!!(await page.$('.scrub--live canvas[data-frames]')), '1440: live scene canvas');
    await scrollTo(page, await sceneY(page, 0.1));
    await sleep(1500);
    const f1 = await frame(page);
    await page.screenshot({ path: join(SHOTS, 'home_1440_scene_p10.png') });
    await scrollTo(page, await sceneY(page, 0.9));
    await sleep(800);
    const f9 = await frame(page);
    await page.screenshot({ path: join(SHOTS, 'home_1440_scene_p90.png') });
    await scrollTo(page, await sceneY(page, 0.1));
    await sleep(800);
    const fBack = await frame(page);
    check(f1 !== null && f9 !== null && f1 !== f9, '1440: frame at p≈0.1 differs from p≈0.9', `${f1} vs ${f9}`);
    check(fBack === f1, '1440: frame returns when scrolling back', `${fBack} vs ${f1}`);
    const active = await page.$eval('.scrub', (e) => e.dataset.active);
    check(active === '0', '1440: first chapter active at p≈0.1', active);
    await walk(page, 'home_1440');
    check(await page.evaluate(() => !!document.querySelector('#today [data-home="clock"], #today .home-note')), '1440: today block rendered (live or explained)');
    const sup = await page.$eval('[data-home="supporters"]', (e) => e.textContent.trim()).catch(() => null);
    check(sup === null || /\d+ раза?$/.test(sup), '1440: supporters counter with a plural form', sup ?? 'no counter');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '1440: no horizontal scroll');
    check(errors.length === 0, '1440: no console errors', errors.slice(0, 3).join(' | '));
    await page.close();
  }
  // 390: static scene, stacked chapters, no horizontal scroll.
  {
    const { page, errors } = await open('/?lang=ru', 390);
    check(!!(await page.$('.scrub--static')), '390: scene is static on touch');
    await walk(page, 'home_390');
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '390: no horizontal scroll');
    check(errors.length === 0, '390: no console errors', errors.slice(0, 3).join(' | '));
    await page.close();
  }
  // reduced motion: no preloader, static scene.
  {
    const { page, errors } = await open('/?lang=en', 1440, { reduced: true });
    check(!!(await page.$('.scrub--static .scrub__poster')), 'reduced: static poster frame');
    check(await page.evaluate(() => document.documentElement.dataset.motion !== 'on'), 'reduced: motion off');
    await page.screenshot({ path: join(SHOTS, 'home_1440_reduced.png') });
    check(errors.length === 0, 'reduced: no console errors', errors.slice(0, 3).join(' | '));
    await page.close();
  }
  // he: RTL, scene renders.
  {
    const { page, errors } = await open('/?lang=he', 1440);
    check(await page.evaluate(() => document.documentElement.dir === 'rtl'), 'he: html dir=rtl');
    await scrollTo(page, await sceneY(page, 0.5));
    await sleep(1200);
    check((await frame(page)) !== null, 'he: scene draws a frame');
    await page.screenshot({ path: join(SHOTS, 'home_1440_he_scene.png') });
    await scrollTo(page, 0);
    await page.screenshot({ path: join(SHOTS, 'home_1440_he_top.png') });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'he: no horizontal scroll');
    check(errors.length === 0, 'he: no console errors', errors.slice(0, 3).join(' | '));
    await page.close();
  }
} catch (e) {
  check(false, `smoke crashed: ${e?.message ?? e}`);
} finally {
  await browser.close();
  stopServer();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nhome smoke: all green');
process.exit(failures.length ? 1 : 0);
