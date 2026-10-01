/**
 * Smoke of the site shell in real Chrome (puppeteer-core + system Chrome). No backend needed.
 *
 *   npm run smoke
 *
 * Uses a running `npx expo start --web --port 8081` if there is one, otherwise starts it and stops it at the end.
 * Env: WEB_URL (http://localhost:8081), CHROME_PATH, SMOKE_SHOTS=<dir for screenshots>.
 * Checks: shell at 1440/390 without horizontal scroll, tokens & fonts, RU/EN/HE switch + RTL + persistence + ?lang=,
 * /_kit: --p, one-shot Reveal, Pinned chapters, Marquee, Rosette; reduced-motion and pointer:coarse = static.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SMOKE_SHOTS;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  server = spawn('npx', ['expo', 'start', '--port', new URL(WEB).port || '8081'], {
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
const errors = [];
const newPage = async () => {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text());
  });
  return page;
};
const shot = async (page, name) => {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
};
const open = async (page, path, { w = 1440, h = 900, touch = false } = {}) => {
  await page.setViewport({ width: w, height: h, hasTouch: touch, isMobile: touch });
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForSelector('.hdr', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
};
const html = (page) =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    motion: document.documentElement.dataset.motion,
  }));
const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await sleep(900);
};
const navText = (page) => page.$$eval('.hdr__nav .hdr__link', (els) => els.map((e) => e.textContent).join(' '));

try {
  // ---------- shell, desktop ----------
  const page = await newPage();
  await open(page, '/');
  await page.evaluate(() => localStorage.clear());
  await open(page, '/');
  let h = await html(page);
  check(h.lang === 'ru' && h.dir === 'ltr', 'default language ru, ltr', JSON.stringify(h));
  check(h.motion === 'on', 'desktop: motion on');
  check(/Общине.*Туристам.*Расписание.*Афиша.*Новости.*Поддержать/.test(await navText(page)), 'main menu (ru)');
  const look = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    font: getComputedStyle(document.body).fontFamily,
    onest: document.fonts.check('16px Onest_400Regular'),
    playfair: document.fonts.check('16px PlayfairDisplay_400Regular'),
    logo: !!document.querySelector('.hdr .logo .magen polygon'),
  }));
  check(look.bg === 'rgb(237, 235, 228)', 'body background = --cream', look.bg);
  check(/Onest/.test(look.font) && look.onest && look.playfair, 'fonts Onest + Playfair loaded', look.font);
  check(look.logo, 'logo with Magen David');
  check(await noHScroll(page), '1440: no horizontal scroll');
  check(!!(await page.$('footer.ftr .ph')), 'footer shows [ВПИШИ] contact placeholders');
  await shot(page, '1440_home');

  // ---------- languages ----------
  await page.click('.hdr__lang [data-lang="he"]');
  await sleep(500);
  h = await html(page);
  check(h.lang === 'he' && h.dir === 'rtl', 'HE: html lang=he dir=rtl', JSON.stringify(h));
  check(/[\u0590-\u05FF]/.test(await navText(page)), 'HE: menu in Hebrew');
  const logoRight = await page.evaluate(() => document.querySelector('.hdr .logo').getBoundingClientRect().left > window.innerWidth / 2);
  check(logoRight, 'HE: layout mirrored (logo on the right)');
  check(await noHScroll(page), 'HE: no horizontal scroll');
  await shot(page, '1440_home_he');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.hdr');
  h = await html(page);
  check(h.lang === 'he' && h.dir === 'rtl', 'HE survives reload');
  await page.click('.hdr__lang [data-lang="en"]');
  await sleep(400);
  check(/Community.*Visitors.*Schedule/.test(await navText(page)), 'EN: English menu');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.hdr');
  check((await html(page)).lang === 'en', 'EN survives reload');
  await open(page, '/?lang=he');
  check((await html(page)).dir === 'rtl', '?lang=he wins over stored choice');
  await open(page, '/?lang=ru');
  check((await html(page)).lang === 'ru', '?lang=ru');

  // ---------- 404 ----------
  await open(page, '/no-such-page-xyz');
  check(!!(await page.$('h1.title')), 'unknown route shows not-found page');

  // ---------- /_kit in motion ----------
  await open(page, '/_kit');
  check(!!(await page.$('#kit-hero')), '/_kit renders');
  const pOf = (sel) => page.$eval(sel, (el) => parseFloat(el.style.getPropertyValue('--p') || '-1'));
  const rot = () => page.$eval('#kit-dawn .rosette', (el) => getComputedStyle(el).transform);
  const lastCard = '.kit-cards .reveal:last-child';
  check((await page.$eval(lastCard, (el) => el.dataset.revealed ?? 'none')) !== 'true', 'Reveal: card hidden before scroll');
  const pinTop = await page.$eval('.pinned', (el) => el.getBoundingClientRect().top + window.scrollY);
  const thrTop = await page.$eval('#kit-threshold', (el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollTo(page, thrTop - 600);
  const p1 = await pOf('#kit-threshold');
  await scrollTo(page, thrTop);
  const p2 = await pOf('#kit-threshold');
  check(p1 >= 0 && p2 > p1, '--p grows with scroll', `${p1} -> ${p2}`);
  await scrollTo(page, pinTop + 10);
  const a0 = await page.$eval('.pinned', (el) => Number(el.dataset.active));
  await scrollTo(page, pinTop + 900 * 2.5);
  const a2 = await page.$eval('.pinned', (el) => Number(el.dataset.active));
  const sticky = await page.$eval('.pinned__sticky', (el) => Math.abs(el.getBoundingClientRect().top) < 2);
  check(a0 === 0 && a2 >= 2 && sticky, 'Pinned: sticky and chapters advance', `${a0} -> ${a2}`);
  await shot(page, '1440_kit_pinned');
  const mq = () => page.$eval('.marquee__track', (el) => getComputedStyle(el).transform);
  await page.$eval('#kit-marquee', (el) => el.scrollIntoView());
  await sleep(300);
  const m1 = await mq();
  await sleep(1000);
  check(m1 !== (await mq()), 'Marquee runs');
  const dawnTop = await page.$eval('#kit-dawn', (el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollTo(page, dawnTop - 700);
  const r1 = await rot();
  await scrollTo(page, dawnTop);
  const r2 = await rot();
  check(r1 !== r2 && r2 !== 'none', 'Rosette rotates with scroll');
  await shot(page, '1440_kit_dawn');
  await page.$eval(lastCard, (el) => el.scrollIntoView({ block: 'center' }));
  await sleep(1200);
  await scrollTo(page, 0);
  check((await page.$eval(lastCard, (el) => el.dataset.revealed)) === 'true', 'Reveal fires once and stays');
  check(await noHScroll(page), '/_kit 1440: no horizontal scroll');
  await page.close();

  // ---------- mobile 390, touch = pointer:coarse ----------
  const mob = await newPage();
  await open(mob, '/', { w: 390, h: 844, touch: true });
  const coarse = await mob.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  check(coarse, '390 touch emulation reports pointer:coarse');
  check((await html(mob)).motion === 'off', 'pointer:coarse: motion off');
  check(await noHScroll(mob), '390: no horizontal scroll');
  await shot(mob, '390_home');
  await mob.click('.hdr__burger');
  await sleep(700);
  check((await mob.$eval('.mnav', (el) => el.dataset.open)) === 'true', '390: full-screen menu opens');
  await shot(mob, '390_menu');
  await mob.click('.mnav__close');
  await open(mob, '/_kit', { w: 390, h: 844, touch: true });
  const coarseKit = await mob.evaluate(() => ({
    pinnedH: document.querySelector('.pinned').getBoundingClientRect().height,
    chapters: [...document.querySelectorAll('.pinned__chapter')].map((c) => getComputedStyle(c).opacity),
    reveal: [...document.querySelectorAll('.reveal')].every((r) => getComputedStyle(r).opacity === '1'),
    marquee: getComputedStyle(document.querySelector('.marquee__track')).animationName,
  }));
  check(
    coarseKit.chapters.every((o) => o === '1') && coarseKit.reveal && coarseKit.marquee === 'none',
    'pointer:coarse: chapters stacked, content visible, marquee stopped',
    JSON.stringify(coarseKit)
  );
  check(await noHScroll(mob), '/_kit 390: no horizontal scroll');
  await shot(mob, '390_kit');
  await mob.close();

  // ---------- prefers-reduced-motion ----------
  const red = await newPage();
  await red.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await open(red, '/_kit');
  const r = await red.evaluate(() => ({
    motion: document.documentElement.dataset.motion,
    sticky: getComputedStyle(document.querySelector('.pinned__sticky')).position,
    chapters: [...document.querySelectorAll('.pinned__chapter')].every((c) => getComputedStyle(c).opacity === '1'),
    reveal: [...document.querySelectorAll('.reveal')].every((x) => getComputedStyle(x).opacity === '1'),
    rosette: getComputedStyle(document.querySelector('.rosette')).transform,
  }));
  check(
    r.motion === 'off' && r.sticky !== 'sticky' && r.chapters && r.reveal && r.rosette === 'none',
    'reduced motion: static, all content visible',
    JSON.stringify(r)
  );
  await red.close();

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, `smoke crashed: ${e.message}`);
} finally {
  await browser.close();
  stopServer();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL OK');
process.exit(failures.length ? 1 : 0);
