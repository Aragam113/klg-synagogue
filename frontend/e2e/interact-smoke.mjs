/**
 * Press-system smoke: desktop 1440 (mouse) and touch 390 (isMobile + hasTouch).
 *
 *   npm run smoke:interact      (WEB_URL=http://localhost:8177 by default; starts Expo there if it is down)
 *
 * For key elements (button, news card, donate preset, language, gallery tile, burger on touch):
 * pointerdown → data-pressed + a scale; held > 400 ms → data-held (+ ripple grows on solid kinds);
 * release → everything cleared after the spring; a 12px slide drops the press; the click still lands
 * (preset gets aria-checked, the card navigates); fields glow instead of scaling; reduced motion → pressed state without any scale.
 * Shots: e2e/shots/interact_<element>_<press|hold>_<desk|touch>.png (cropped around the element).
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8177';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.env.SMOKE_SHOTS ?? join(ROOT, 'e2e', 'shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(SHOTS, { recursive: true });

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

const albums = await fetch(`${API}/albums`).then((r) => r.json()).catch(() => ({ data: [] }));
const albumSlug = albums.data?.[0]?.slug;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
});

const open = async (path, { touch, reduced = false }) => {
  const page = await browser.newPage();
  await page.setViewport(
    touch
      ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { width: 1440, height: 900, deviceScaleFactor: 1 },
  );
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('synagogue.preloaded', '1');
    localStorage.setItem('synagogue.cookieConsent', '1');
  });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.waitForSelector('.hdr, .adm-login, .shell--bare', { timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 8000 }).catch(() => undefined);
  await sleep(500);
  return page;
};

/** Brings the element into the middle of the viewport and returns its centre (or null). */
const locate = async (page, sel) => {
  const ok = await page.evaluate((s) => {
    document.querySelectorAll('[data-probe]').forEach((e) => e.removeAttribute('data-probe'));
    const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0);
    if (!el) return false;
    el.setAttribute('data-probe', '');
    el.scrollIntoView({ block: 'center', inline: 'center' });
    return true;
  }, sel);
  if (!ok) return null;
  await sleep(700);
  return page.evaluate(() => {
    const r = document.querySelector('[data-probe]').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  });
};

const state = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-probe]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    return {
      pressed: el.getAttribute('data-pressed'),
      held: el.hasAttribute('data-held'),
      released: el.getAttribute('data-released'),
      scale: cs.scale,
      shadow: cs.boxShadow,
      transform: cs.transform,
      ripple: el.getAttribute('data-press-kind') === 'solid' ? before.scale : null,
      rippleOn: before.content !== 'none' && parseFloat(before.opacity) > 0,
    };
  });
const scaled = (s) => s && s.scale !== 'none' && s.scale !== '1';

const crop = async (page, name, c) => {
  const pad = 28;
  const vp = page.viewport();
  const x = Math.max(0, c.x - c.w / 2 - pad);
  const y = Math.max(0, c.y - c.h / 2 - pad);
  const sc = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  await page.screenshot({
    path: join(SHOTS, `interact_${name}.png`),
    clip: { x: x + sc.x, y: y + sc.y, width: Math.min(vp.width - x, c.w + pad * 2), height: Math.min(vp.height - y, c.h + pad * 2) },
  });
};

const input = (page, touch) => ({
  down: (x, y) => (touch ? page.touchscreen.touchStart(x, y) : page.mouse.move(x, y).then(() => page.mouse.down())),
  move: (x, y) => (touch ? page.touchscreen.touchMove(x, y) : page.mouse.move(x, y, { steps: 3 })),
  up: () => (touch ? page.touchscreen.touchEnd() : page.mouse.up()),
});

/** Full press cycle on one element: press, hold, release, slide-cancel. */
const cycle = async (page, sel, name, touch, { solid = false, glow = false } = {}) => {
  const tag = `${name} [${touch ? 'touch 390' : 'desk 1440'}]`;
  const c = await locate(page, sel);
  check(!!c, `${tag}: element ${sel} on page`);
  if (!c) return;
  const io = input(page, touch);
  await page.evaluate(() => {
    window.__guard = (e) => e.preventDefault();
    document.addEventListener('click', window.__guard, true);
  });
  if (!touch) await page.mouse.move(c.x, c.y);
  await io.down(c.x, c.y);
  await sleep(120);
  const p = await state(page);
  check(p?.pressed !== null && p?.pressed !== undefined, `${tag}: pointerdown → data-pressed`, p?.pressed);
  if (glow) check(p?.shadow && p.shadow !== 'none', `${tag}: pressed → gold glow (fields do not scale)`, p?.shadow);
  else check(scaled(p), `${tag}: pressed → scale`, p?.scale);
  await crop(page, `${name}_press_${touch ? 'touch' : 'desk'}`, c);
  await sleep(380);
  const h = await state(page);
  check(h?.held, `${tag}: held 500 ms → data-held`);
  if (solid) check(parseFloat(h?.ripple ?? '0') > 0.2, `${tag}: ripple grows while held`, h?.ripple);
  await crop(page, `${name}_hold_${touch ? 'touch' : 'desk'}`, c);
  await io.up();
  await sleep(40);
  const r = await state(page);
  check(r?.pressed === null && !r?.held && !!r?.released, `${tag}: release → pressed/held cleared, spring running`, r?.released);
  await sleep(600);
  const r2 = await state(page);
  check(r2?.released === null && !scaled(r2), `${tag}: after the spring — back to rest`, r2?.scale);
  // slide 12px → not a press
  await io.down(c.x, c.y);
  await sleep(60);
  await io.move(c.x + 12, c.y);
  await sleep(60);
  const m = await state(page);
  check(m?.pressed === null, `${tag}: finger moved 12px → press dropped`);
  await io.up();
  await sleep(100);
  await page.evaluate(() => {
    document.removeEventListener('click', window.__guard, true);
    document.querySelector('[data-probe]')?.removeAttribute('data-probe');
  });
};

const tap = async (page, sel, touch) => {
  const c = await locate(page, sel);
  if (!c) return false;
  const io = input(page, touch);
  await io.down(c.x, c.y);
  await sleep(80);
  await io.up();
  await sleep(400);
  return true;
};

try {
  for (const touch of [false, true]) {
    const mode = touch ? 'touch 390' : 'desk 1440';
    // home: hero button, news card
    let page = await open('/', { touch });
    await cycle(page, '#hero .btn, .home-hero .btn', 'button', touch, { solid: true });
    await cycle(page, '#news .card--link, .cnt-news', 'card', touch);
    if (touch) await cycle(page, '.hdr__burger', 'burger', touch);
    else await cycle(page, '.hdr .lang__btn[aria-pressed="false"]', 'lang', touch, { solid: true });
    // the click still lands: a card tap navigates
    const href = await page.evaluate(() => document.querySelector('#news .card--link, .cnt-news')?.getAttribute('href'));
    await tap(page, '#news .card--link, .cnt-news', touch);
    await page.waitForFunction(() => location.pathname.startsWith('/news/'), { timeout: 8000 }).catch(() => undefined);
    check(page.url().includes('/news/'), `card tap navigates [${mode}]`, href);
    await page.close();

    // donate: preset chip, plus click → aria-checked
    page = await open('/donate', { touch });
    await cycle(page, '.don-chip:not(.is-on)', 'preset', touch, { solid: true });
    const pick = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.don-chip')].find((e) => e.getAttribute('aria-checked') !== 'true');
      el.setAttribute('data-pick', '');
      return el.dataset.preset;
    });
    await tap(page, '[data-pick]', touch);
    const checked = await page.evaluate(() => document.querySelector('[data-pick]')?.getAttribute('aria-checked'));
    check(checked === 'true', `preset tap selects the amount [${mode}]`, pick);
    await cycle(page, '.field__input', 'field', touch, { glow: true });
    await page.close();

    // menu languages on touch
    if (touch) {
      page = await open('/', { touch });
      await tap(page, '.hdr__burger', touch);
      await sleep(700);
      await cycle(page, '.mnav .lang__btn[aria-pressed="false"]', 'lang', touch, { solid: true });
      await page.close();
    }

    // gallery tile
    if (albumSlug) {
      page = await open(`/gallery/${albumSlug}`, { touch });
      await cycle(page, '.cnt-photo', 'tile', touch);
      await page.close();
    } else check(false, 'gallery: no album from API');
  }

  // reduced motion: pressed state, no scale, no ripple
  for (const touch of [false, true]) {
    const page = await open('/donate', { touch, reduced: true });
    const c = await locate(page, '.don-chip');
    const io = input(page, touch);
    await io.down(c.x, c.y);
    await sleep(500);
    const s = await state(page);
    check(s?.pressed === 'solid' && !scaled(s), `reduced motion: pressed without scale [${touch ? 'touch' : 'desk'}]`, s?.scale);
    check(s && !s.rippleOn, `reduced motion: no ripple [${touch ? 'touch' : 'desk'}]`);
    await io.up();
    await page.close();
  }

  // admin login page: the same system works there (bare shell)
  {
    const page = await open('/admin/login', { touch: false });
    await cycle(page, 'button[type="submit"]', 'admin_button', false, { solid: true });
    await page.close();
  }
} catch (e) {
  console.error(e);
  failures.push(String(e));
} finally {
  await browser.close();
  stopServer();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nall interact checks passed');
process.exit(failures.length ? 1 : 0);
