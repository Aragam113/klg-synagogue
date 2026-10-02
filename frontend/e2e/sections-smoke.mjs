/**
 * Smoke of the static sections in real Chrome: every page × ru/en/he × 1440/390.
 *
 *   npm run smoke:sections            (WEB_URL=http://localhost:8096 for another port)
 *
 * Uses a running Expo web on WEB_URL or starts one. No backend needed (TodayWidget stays empty without it).
 * Env: WEB_URL, CHROME_PATH, SMOKE_SHOTS=<dir> — screenshots of every page (top + scrolled).
 * Checks per page: no console errors/page errors, <h1>, html[dir]/[lang], no horizontal scroll,
 * "alive" (Reveal reveals on scroll, hero HexPattern + «Созвездие» ghost words clear of the title, --p moves), header phone tel: link.
 * Specials: /visit/how-to-get — OSM iframe + Yandex/Google links with coordinates;
 * /history — TOC anchors resolve to chapters, timeline --p grows while scrolling.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

import { ghostUnderTitle } from './ghost-check.mjs';

const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SMOKE_SHOTS;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  '/community',
  '/visit',
  '/visit/hours',
  '/visit/how-to-get',
  '/visit/rules',
  '/visit/excursions',
  '/visit/museum',
  '/visit/kosher',
  '/history',
  '/about',
  '/contacts',
  '/privacy',
  '/consent',
];
const LANGS = ['ru', 'en', 'he'];
const WIDTHS = [1440, 390];
/** Pages without the dark hero (plain legal text). */
const NO_HERO = new Set(['/privacy', '/consent']);

const failures = [];
const check = (ok, what, extra = '') => {
  if (!ok || process.env.VERBOSE) console.log(`${ok ? 'OK  ' : 'FAIL'} ${what}${extra ? ` (${extra})` : ''}`);
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
  server = spawn('npx', ['expo', 'start', '--web', '--port', new URL(WEB).port || '8081'], {
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

let errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = m.location()?.url ?? '';
  // Third-party frame (OpenStreetMap embed) and API calls without a backend are not our errors.
  if (/openstreetmap|tile\.|favicon/.test(url) || /Failed to load resource/.test(m.text())) return;
  errors.push(m.text());
});

const scrollThrough = async () => {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.6;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  await sleep(500);
};

try {
  for (const w of WIDTHS) {
    await page.setViewport({ width: w, height: w > 500 ? 900 : 844 });
    for (const lang of LANGS) {
      for (const path of PAGES) {
        const tag = `${path} ${lang} ${w}`;
        errors = [];
        await page.goto(`${WEB}${path}?lang=${lang}`, { waitUntil: 'networkidle2', timeout: 180000 });
        await page.waitForSelector('.hdr', { timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        await sleep(500);

        const top = await page.evaluate(() => ({
          dir: document.documentElement.dir,
          lang: document.documentElement.lang,
          h1: document.querySelector('main h1, h1')?.textContent?.trim() ?? '',
          hex: !!document.querySelector('.sx-hero .hexpattern'),
          ghost: !!document.querySelector('.sx-hero .gf .gf-w'),
          tel: [...document.querySelectorAll('.hdr a[href^="tel:"]')].map((a) => a.getAttribute('href')),
          motion: document.documentElement.dataset.motion,
          title: document.title,
          old: /Синагога Калининграда|Kaliningrad Synagogue/.test(document.querySelector('.hdr')?.textContent ?? ''),
        }));
        // Page title: "<page> — Новая синагога, Калининград"; the header never shows the old name.
        const FULL = { ru: 'Новая синагога, Калининград', en: 'New Synagogue, Kaliningrad', he: 'בית הכנסת החדש, קלינינגרד' }[lang];
        check(top.title.endsWith(` — ${FULL}`), `${tag}: <title> ends with the full site name`, top.title);
        check(!top.old, `${tag}: no old site name in the header`);
        check(top.dir === (lang === 'he' ? 'rtl' : 'ltr'), `${tag}: dir`, top.dir);
        check(top.lang.startsWith(lang), `${tag}: html lang`, top.lang);
        check(top.h1.length > 0, `${tag}: h1`);
        check(top.tel.includes('tel:+74012464345'), `${tag}: header phone`, top.tel.join(','));
        if (!NO_HERO.has(path)) {
          check(top.hex && top.ghost, `${tag}: hero HexPattern + GhostField`);
          const under = await ghostUnderTitle(page);
          check(under.length === 0, `${tag}: ghost words clear of the titles`, under.join('; '));
        }
        if (SHOTS) {
          mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: join(SHOTS, `${w}_${lang}${path.replaceAll('/', '_')}.png`) });
        }

        const pBefore = await page.evaluate(() => {
          const el = document.querySelector('.hexpattern');
          return el ? getComputedStyle(el).getPropertyValue('--p') : '';
        });
        await scrollThrough();
        const after = await page.evaluate(() => {
          const all = [...document.querySelectorAll('[data-reveal]')];
          const hex = document.querySelector('.hexpattern');
          return {
            reveals: all.length,
            hidden: all.filter((e) => e.dataset.revealed !== 'true').length,
            p: hex ? getComputedStyle(hex).getPropertyValue('--p') : '',
            sw: document.documentElement.scrollWidth,
            iw: window.innerWidth,
          };
        });
        check(after.sw <= after.iw, `${tag}: no horizontal scroll`, `${after.sw} > ${after.iw}`);
        if (!NO_HERO.has(path) && top.motion === 'on') {
          check(after.reveals > 0 && after.hidden === 0, `${tag}: Reveal`, `${after.hidden}/${after.reveals} hidden`);
          check(pBefore !== after.p, `${tag}: --p moves (parallax)`, `${pBefore} → ${after.p}`);
        }

        if (path === '/visit/how-to-get') {
          const map = await page.evaluate(() => ({
            iframe: document.querySelector('iframe.sx-map__frame')?.getAttribute('src') ?? '',
            links: [...document.querySelectorAll('a')].map((a) => a.href),
          }));
          check(/openstreetmap\.org\/export\/embed/.test(map.iframe), `${tag}: OSM iframe`, map.iframe);
          check(map.links.some((h) => /yandex\.ru\/maps.*54\.70/.test(h)), `${tag}: Yandex link with coords`);
          check(map.links.some((h) => /google\.[a-z]+\/maps.*54\.70/.test(h)), `${tag}: Google link with coords`);
        }
        if (path === '/history') {
          const h = await page.evaluate(async () => {
            const toc = [...document.querySelectorAll('.sx-toc a')].map((a) => a.getAttribute('href'));
            const missing = toc.filter((x) => !document.querySelector(x));
            const tl = document.querySelector('.sx-timeline');
            const p = () => Number(getComputedStyle(tl).getPropertyValue('--p') || 0);
            const top = tl.getBoundingClientRect().top + window.scrollY;
            window.scrollTo(0, top - window.innerHeight * 0.8);
            await new Promise((r) => setTimeout(r, 400));
            const p1 = p();
            tl.scrollIntoView({ block: 'end' });
            await new Promise((r) => setTimeout(r, 400));
            return { toc: toc.length, missing, p1, p2: p(), figs: document.querySelectorAll('.sx-figure .sx-credit').length };
          });
          check(h.toc >= 5 && h.missing.length === 0, `${tag}: TOC anchors`, h.missing.join(','));
          check(h.figs > 0, `${tag}: photos with attribution`);
          if (top.motion === 'on') check(h.p2 > h.p1, `${tag}: timeline draws from --p`, `${h.p1} → ${h.p2}`);
        }

        check(errors.length === 0, `${tag}: console clean`, errors.slice(0, 3).join(' | '));
      }
    }
  }
} finally {
  await browser.close();
  stopServer();
}

const total = PAGES.length * LANGS.length * WIDTHS.length;
console.log(failures.length ? `\n${failures.length} FAILED of ${total} page loads` : `\nsections smoke OK (${total} page loads)`);
process.exit(failures.length ? 1 : 0);
