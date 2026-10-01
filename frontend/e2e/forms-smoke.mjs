/**
 * Smoke of the request forms in real Chrome (puppeteer-core + system Chrome). Needs the backend.
 *
 *   npm run smoke:forms
 *
 * Uses running Expo web (:8081) and backend (:3000) or starts them and stops them at the end.
 * Env: WEB_URL, API_URL (http://localhost:3000/api/v1), CHROME_PATH, SMOKE_SHOTS=<dir for screenshots>.
 * ≤ 8 POSTs (the backend allows 10 form POSTs a minute per IP) — do not run it twice within a minute.
 * Checks: Мишеберах — empty send → field errors (ru/en/he, RTL), typed values stay, button is blocked while sending,
 * filled → «Заявка принята» with a number; excursion — date in 2 days → date_too_soon, a Saturday → date_closed;
 * footer subscription → «Спасибо»; 390px without horizontal scroll.
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
    return (await fetch(url)).status < 500;
  } catch {
    return false;
  }
};

const servers = [];
const ensure = async (url, cwd, args) => {
  if (await up(url)) return;
  console.log(`starting ${args.join(' ')} for ${url} ...`);
  servers.push(
    spawn('npx', args, {
      cwd,
      shell: true,
      env: { ...process.env, CI: '1', BROWSER: 'none' },
      stdio: 'ignore',
    })
  );
  for (let i = 0; i < 240 && !(await up(url)); i++) await sleep(1000);
};
const stopServers = () => {
  for (const s of servers) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
    else s.kill('SIGTERM');
  }
};

await ensure(`${API}/calendar/today`, join(ROOT, '..', 'backend'), ['nest', 'start']);
await ensure(WEB, ROOT, ['expo', 'start', '--port', new URL(WEB).port || '8081']);

/** YYYY-MM-DD in Kaliningrad, `days` from today. */
const kldDate = (days) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kaliningrad' }).format(new Date());
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const weekday = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

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
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
};
const open = async (page, path, { w = 1440, h = 900 } = {}) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForSelector('.hdr', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  // the cookie notice sits over the bottom of the screen — accept it like a visitor would
  const cookie = await page.$('.cookie button');
  if (cookie) await cookie.click();
  await sleep(300);
};
/** Sets a controlled input/textarea value the way React notices. */
const fill = (page, sel, value) =>
  page.$eval(
    sel,
    (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value
  );
const tick = (page, sel) =>
  page.$eval(sel, (el) => {
    if (!el.checked) el.click();
  });
const fieldError = (page, form, name) =>
  page.evaluate(
    (f, n) => {
      const input = document.querySelector(`${f} [name="${n}"]`);
      const box = input?.closest('.field, .check-wrap, .subscribe__cell');
      return box?.querySelector('.field__error')?.textContent ?? null;
    },
    form,
    name
  );
const submitAndWait = async (page, form, until) => {
  await page.click(`${form} button[type="submit"]`);
  await page.waitForFunction(until, { timeout: 20000 });
};

try {
  check(await up(`${API}/calendar/today`), 'backend is up', API);
  const page = await newPage();
  const F = '.fp__form';

  // --- Мишеберах RU: empty send → field errors, values stay ---
  await open(page, '/prayers/misheberah?lang=ru');
  await page.waitForSelector(`${F} [name="forName"]`, { timeout: 30000 });
  await fill(page, `${F} [name="lastName"]`, 'Коэн');
  await submitAndWait(page, F, () => document.querySelectorAll('.fp__form .field__error').length > 0);
  const ru = {
    firstName: await fieldError(page, F, 'firstName'),
    forName: await fieldError(page, F, 'forName'),
    consent: await fieldError(page, F, 'consent'),
    lastName: await page.$eval(`${F} [name="lastName"]`, (e) => e.value),
    banner: await page.$eval('[data-banner]', (e) => e.textContent).catch(() => null),
  };
  check(ru.firstName === 'Обязательное поле' && ru.forName === 'Обязательное поле', 'RU: required field errors', JSON.stringify(ru));
  check(!!ru.consent, 'RU: consent is required');
  check(ru.lastName === 'Коэн', 'typed value stays after an error');
  check(ru.banner === 'Проверьте заполнение полей', 'RU: banner over the form');
  await fill(page, `${F} [name="email"]`, 'not-an-email');
  await shot(page, 'forms-misheberah-errors-1440');

  // --- fill and send (slowed down) → button blocked → «Заявка принята» ---
  await fill(page, `${F} [name="firstName"]`, 'Давид');
  await fill(page, `${F} [name="email"]`, 'smoke-forms@example.com');
  await fill(page, `${F} [name="forName"]`, 'Моше');
  await fill(page, `${F} [name="motherName"]`, 'Сара');
  await tick(page, `${F} [name="consent"]`);
  await page.setRequestInterception(true);
  const slow = async (req) => {
    if (req.method() === 'POST' && req.url().includes('/requests/prayer')) await sleep(1200);
    req.continue();
  };
  page.on('request', slow);
  await page.click(`${F} button[type="submit"]`);
  await sleep(300);
  const blocked = await page.$eval(`${F} button[type="submit"]`, (b) => b.disabled).catch(() => false);
  check(blocked, 'submit button is blocked while sending');
  await page.waitForSelector('[data-accepted] [data-request-number]', { timeout: 20000 });
  page.off('request', slow);
  await page.setRequestInterception(false);
  const num = await page.$eval('[data-request-number]', (e) => e.textContent);
  const accepted = await page.$eval('[data-accepted]', (e) => e.textContent);
  check(/^[0-9A-F]{8}$/.test(num) && /Заявка принята/.test(accepted), 'Мишеберах → «Заявка принята» with a number', num);
  await shot(page, 'forms-misheberah-accepted-1440');

  // --- EN / HE: errors in the interface language, RTL ---
  await open(page, '/prayers/misheberah?lang=en');
  await page.waitForSelector(`${F} [name="forName"]`, { timeout: 30000 });
  await submitAndWait(page, F, () => document.querySelectorAll('.fp__form .field__error').length > 0);
  const en = await fieldError(page, F, 'firstName');
  check(!!en && /^[\x20-\x7E]+$/.test(en) && !/required$/.test(en), 'EN: field error in English', en);

  await open(page, '/prayers/misheberah?lang=he');
  await page.waitForSelector(`${F} [name="forName"]`, { timeout: 30000 });
  await submitAndWait(page, F, () => document.querySelectorAll('.fp__form .field__error').length > 0);
  const he = {
    dir: await page.evaluate(() => document.documentElement.dir),
    err: await fieldError(page, F, 'firstName'),
  };
  check(he.dir === 'rtl' && /[\u0590-\u05FF]/.test(he.err ?? ''), 'HE: RTL and field error in Hebrew', JSON.stringify(he));
  await shot(page, 'forms-misheberah-he-1440');

  // --- excursion: in 2 days → date_too_soon; a Saturday ≥ 3 days → date_closed ---
  await open(page, '/visit/excursions/book?lang=ru');
  await page.waitForSelector(`${F} [name="date"]`, { timeout: 30000 });
  await fill(page, `${F} [name="name"]`, 'Анна Турист');
  await fill(page, `${F} [name="phone"]`, '+7 900 000-00-00');
  await fill(page, `${F} [name="people"]`, '2');
  await tick(page, `${F} [name="consent"]`);
  await fill(page, `${F} [name="date"]`, kldDate(2));
  await submitAndWait(page, F, () => !!document.querySelector('.fp__form .field--error [name="date"]'));
  const soon = await fieldError(page, F, 'date');
  check(/не раньше чем через 3 дня от сегодня/.test(soon ?? ''), 'excursion in 2 days → date_too_soon', soon);
  let sat = 3;
  while (weekday(kldDate(sat)) !== 6) sat++;
  await fill(page, `${F} [name="date"]`, kldDate(sat));
  await submitAndWait(page, F, () => !!document.querySelector('.fp__form .field--error [name="date"]'));
  const closed = await fieldError(page, F, 'date');
  check(/закрыта/.test(closed ?? ''), 'excursion on Saturday → date_closed', `${kldDate(sat)}: ${closed}`);
  check((await page.$eval(`${F} [name="name"]`, (e) => e.value)) === 'Анна Турист', 'excursion keeps typed values');
  await shot(page, 'forms-excursion-1440');

  // --- footer subscription ---
  const S = '.ftr form.subscribe';
  await page.$eval('.ftr', (e) => e.scrollIntoView());
  await fill(page, `${S} [name="email"]`, 'bad');
  await submitAndWait(page, S, () => document.querySelectorAll('.ftr .subscribe .field__error').length > 0);
  const subErr = { name: await fieldError(page, S, 'name'), email: await fieldError(page, S, 'email') };
  check(subErr.name === 'Обязательное поле' && !!subErr.email, 'subscription: field errors', JSON.stringify(subErr));
  await fill(page, `${S} [name="name"]`, 'Смоук');
  await fill(page, `${S} [name="email"]`, 'smoke-subscribe@example.com');
  await tick(page, `${S} [name="consent"]`);
  await submitAndWait(page, S, () => !!document.querySelector('.ftr [data-subscribed]'));
  const done = await page.$eval('.ftr [data-subscribed]', (e) => e.textContent);
  check(/Спасибо/.test(done), 'subscription → «Спасибо»', done);
  await shot(page, 'forms-subscribe-1440');

  // --- 390px: no horizontal scroll on the forms ---
  for (const path of ['/prayers/kaddish', '/visit/excursions/book', '/appointment']) {
    await open(page, `${path}?lang=ru`, { w: 390, h: 844 });
    await page.waitForSelector(F, { timeout: 30000 });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= 390, `390px ${path}: no horizontal scroll`, String(sw));
  }

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, 'smoke crashed', e.message);
} finally {
  await browser.close();
  stopServers();
}

if (failures.length) {
  console.log(`\n${failures.length} FAILED`);
  process.exit(1);
}
console.log('\nforms smoke OK');
