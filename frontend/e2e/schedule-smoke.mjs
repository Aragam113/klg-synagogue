/**
 * Smoke of the calendar in real Chrome: /schedule, /holidays/[key], TodayWidget. Needs the backend.
 *
 *   npm run smoke:schedule
 *
 * Uses running Expo web (:8081) and backend (:3000) or starts them and stops them at the end.
 * Env: WEB_URL, API_URL (http://localhost:3000/api/v1), CHROME_PATH, SMOKE_SHOTS=<dir for screenshots>.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SMOKE_SHOTS;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const check = (ok, what, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${what}${extra ? ` (${extra})` : ''}`);
  if (!ok) failures.push(what);
};
const up = async (url) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};
const servers = [];
const ensure = async (url, cwd, args) => {
  if (await up(url)) return;
  console.log(`starting ${args.join(' ')} in ${cwd} ...`);
  servers.push(
    spawn('npx', args, {
      cwd,
      shell: true,
      env: { ...process.env, CI: '1', BROWSER: 'none' },
      stdio: 'ignore',
    })
  );
  for (let i = 0; i < 180 && !(await up(url)); i++) await sleep(1000);
};
const stopServers = () => {
  for (const s of servers) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
    else s.kill('SIGTERM');
  }
};

await ensure(`${API}/calendar/today`, join(ROOT, '..', 'backend'), ['nest', 'start']);
await ensure(WEB, ROOT, ['expo', 'start', '--port', new URL(WEB).port || '8081']);

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
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
};
const open = async (page, path, { w = 1440, h = 900 } = {}) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForSelector('.hdr', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
};
const count = (page, sel) => page.$$eval(sel, (els) => els.length);

try {
  check(await up(`${API}/calendar/today`), 'backend calendar API is up', API);
  const page = await newPage();

  // --- /schedule: 14 days, today highlighted, Shabbat marked ---
  await open(page, '/schedule?lang=ru');
  await page.waitForSelector('.sch-day', { timeout: 30000 });
  const list = await page.evaluate(() => ({
    days: document.querySelectorAll('.sch-list .sch-day').length,
    today: document.querySelectorAll('.sch-day.is-today').length,
    shabbat: document.querySelectorAll('.sch-day.is-shabbat').length,
    candles: [...document.querySelectorAll('.sch-day .sch-gold dd')].some((d) => /^\d\d:\d\d$/.test(d.textContent)),
    h1: document.querySelector('h1')?.textContent ?? '',
    title: document.title,
  }));
  check(list.days === 14, '/schedule shows 14 days', String(list.days));
  check(list.today === 1 && list.shabbat >= 2, 'today highlighted, Shabbat marked', JSON.stringify(list));
  check(list.candles, 'candle lighting / havdalah times are shown');
  check(/Расписание/.test(list.h1) && /Расписание/.test(list.title), 'RU title', list.h1);
  const honest = await page.evaluate(() => {
    const unknown = [...document.querySelectorAll('.sch-day')].filter((d) => d.querySelector('.sch-day__ask'));
    return { unknown: unknown.length, notice: !!document.querySelector('.sch-unknown') };
  });
  check(honest.unknown === 0 || honest.notice, 'days without service times say «уточняйте по телефону»', JSON.stringify(honest));
  await shot(page, 'schedule-list-1440');

  // --- zmanim ---
  await page.click('.sch-toggle--zmanim');
  await sleep(200);
  check((await count(page, '.sch-day .sch-zmanim')) === 14, '«Показать зманим» opens zmanim for each day');

  // --- table ---
  await page.click('.sch-toggle[data-view="table"]');
  await page.waitForSelector('.sch-table', { timeout: 5000 });
  const table = await page.evaluate(() => ({
    rows: document.querySelectorAll('.sch-table tbody tr').length,
    cols: document.querySelectorAll('.sch-table thead th').length,
    today: document.querySelectorAll('.sch-table tr.is-today').length,
  }));
  check(table.rows === 14 && table.cols === 16 && table.today === 1, 'table view with zmanim columns', JSON.stringify(table));
  const fri = await page.$$eval('.sch-day dt, .sch-table__label', (els) => els.map((e) => e.textContent));
  check(fri.includes('Встреча Шаббата'), 'Friday evening service is labelled «Встреча Шаббата»');
  await shot(page, 'schedule-table-1440');
  await page.click('.sch-toggle[data-view="list"]');
  await page.click('.sch-toggle--zmanim');

  // --- month/year: December of this year (Chanukah) -> holiday link ---
  const year = await page.$eval('select[name="year"]', (s) => s.value);
  await page.select('select[name="month"]', '12');
  await page.waitForFunction(() => document.querySelectorAll('.sch-list .sch-day').length === 31, { timeout: 15000 });
  const dec = await page.$$eval('.sch-day', (els) => [els[0].dataset.date, els[els.length - 1].dataset.date]);
  check(dec[0] === `${year}-12-01` && dec[1] === `${year}-12-31`, 'month picker loads the whole month', dec.join('…'));
  await page.select('select[name="year"]', String(Number(year) + 1));
  await page.waitForFunction(
    (y) => document.querySelector('.sch-list .sch-day')?.dataset.date === `${y}-12-01`,
    { timeout: 15000 },
    String(Number(year) + 1)
  );
  check(true, 'year picker switches the year');

  const href = await page.$eval('.sch-hol--link', (a) => a.getAttribute('href')).catch(() => null);
  check(!!href && href.startsWith('/holidays/'), 'holidays in the calendar are links', href ?? 'none');
  if (href) {
    await page.click('.sch-hol--link');
    await page.waitForFunction(() => location.pathname.startsWith('/holidays/'), { timeout: 10000 });
    await page.waitForSelector('.hol-dates li', { timeout: 15000 });
    const hol = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.textContent ?? '',
      dates: document.querySelectorAll('.hol-dates li').length,
      text: document.querySelector('.hol-text')?.textContent?.length ?? 0,
    }));
    check(hol.h1.length > 0 && hol.dates > 0 && hol.text > 40, '/holidays/[key] opens from the calendar', JSON.stringify(hol));
    await shot(page, 'holiday-1440');
  }

  // --- unknown holiday -> not found, no crash ---
  await open(page, '/holidays/no-such-holiday');
  await page.waitForSelector('.empty', { timeout: 15000 });
  check(true, 'unknown holiday shows «нет в справочнике»');

  // --- TodayWidget in the header: countdown ticks ---
  await open(page, '/_kit');
  await page.waitForSelector('.tw--header [data-countdown]', { timeout: 15000 });
  const t1 = await page.$eval('.tw--header [data-countdown]', (e) => e.textContent);
  await sleep(1600);
  const t2 = await page.$eval('.tw--header [data-countdown]', (e) => e.textContent);
  check(t1 !== t2, 'TodayWidget countdown ticks', `${t1} -> ${t2}`);

  // --- HE: RTL + Hebrew texts ---
  await open(page, '/schedule?lang=he');
  await page.waitForSelector('.sch-day', { timeout: 30000 });
  const he = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    h1: document.querySelector('h1')?.textContent ?? '',
    widget: document.querySelector('.tw--header .tw__label')?.textContent ?? '',
  }));
  check(he.dir === 'rtl' && /[\u0590-\u05FF]/.test(he.h1) && /[\u0590-\u05FF]/.test(he.widget), 'HE: RTL and Hebrew', JSON.stringify(he));
  await shot(page, 'schedule-he-1440');

  // --- EN ---
  await open(page, '/schedule?lang=en');
  await page.waitForSelector('.sch-day', { timeout: 30000 });
  check(/Prayer/.test(await page.$eval('h1', (e) => e.textContent)), 'EN title');

  // --- mobile 390: no horizontal scroll, widget in the menu ---
  await open(page, '/schedule?lang=ru', { w: 390, h: 844 });
  await page.waitForSelector('.sch-day', { timeout: 30000 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 390, '390px: no horizontal scroll', String(sw));
  await page.click('.sch-toggle[data-view="table"]');
  await sleep(200);
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw2 <= 390, '390px table: scrolls inside its box', String(sw2));
  await shot(page, 'schedule-390');
  for (const [w, lang] of [[390, 'ru'], [390, 'he'], [1100, 'ru'], [1100, 'he']]) {
    await open(page, `/schedule?lang=${lang}`, { w, h: 844 });
    await page.waitForSelector('.tw-bar-host .tw--bar [data-countdown]', { timeout: 15000 });
    const r = await page.evaluate(() => {
      const mid = (sel) => {
        const b = document.querySelector(sel)?.getBoundingClientRect();
        return b && b.height ? b.top + b.height / 2 : null;
      };
      const hdr = document.querySelector('.hdr').getBoundingClientRect();
      const bar = document.querySelector('.tw--bar').getBoundingClientRect();
      // logo, search, and the menu button (<1024) or the language switch (>=1024)
      const menu = mid('.hdr .hdr__burger') ?? mid('.hdr .hdr__lang');
      const rows = [mid('.hdr .logo'), mid('.hdr .hdr__icon'), menu];
      return {
        oneRow: rows.every((y) => y !== null && Math.abs(y - rows[0]) < 12),
        below: bar.top >= hdr.bottom - 1 && bar.height > 0,
        sw: document.documentElement.scrollWidth,
      };
    });
    check(r.oneRow && r.below && r.sw <= w, `${w}px ${lang}: header row intact, «Сегодня» bar below it`, JSON.stringify(r));
  }
  await open(page, '/', { w: 390, h: 844 });
  check((await count(page, '.tw--bar')) === 0, 'home has no today bar (own block)');
  await open(page, '/schedule?lang=ru', { w: 390, h: 844 });
  await page.click('.hdr__burger');
  await sleep(500);
  check((await count(page, '.mnav .tw--menu [data-countdown]')) === 1, 'TodayWidget in the mobile menu');

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, `smoke crashed: ${e.message}`);
} finally {
  await browser.close();
  stopServers();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL OK');
process.exit(failures.length ? 1 : 0);
