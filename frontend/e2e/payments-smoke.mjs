/**
 * Smoke of payments in real Chrome against the fake checkout:
 * donation (preset, anonymous, dedication) -> /dev-pay -> «Оплатить» -> /thanks «paid», counter +1;
 * donation -> «Отменить» -> «canceled», counter unchanged; monthly -> paid -> cancel the subscription;
 * free event (created through the admin API, deleted at the end) -> registration accepted;
 * paid event (700 ₽, 2 seats) -> payment block shows «2 × 700 = 1400» before checkout;
 * /donate on en/he (RTL) and at 390px without horizontal scroll.
 *
 *   npm run smoke:payments
 *
 * Env: WEB_URL (default :8081), API_URL (http://localhost:3000/api/v1), CHROME_PATH, SMOKE_SHOTS=<dir>.
 * Makes 5 form POSTs (limit 10/min/IP) — do not run more often than once a minute.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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
    if (process.platform === 'win32')
      spawn('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
    else s.kill('SIGTERM');
  }
};

const adminCreds = () => {
  if (process.env.SMOKE_ADMIN_EMAIL)
    return [process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD];
  const env = join(ROOT, '..', 'backend', '.env');
  if (!existsSync(env)) return null;
  const m = readFileSync(env, 'utf8').match(/Dev-админ[^:]*:\s*(\S+@\S+)\s*\/\s*(\S+)/);
  return m ? [m[1], m[2]] : null;
};
const api = async (path, { method = 'GET', body, token } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json.data };
};

await ensure(`${API}/news`, join(ROOT, '..', 'backend'), ['nest', 'start']);

await ensure(`${API}/payments/mode`, join(ROOT, '..', 'backend'), ['nest', 'start']);
await ensure(WEB, ROOT, ['expo', 'start', '--port', new URL(WEB).port || '8081']);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none'],
});
const errors = [];
const page = await browser.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text()))
    errors.push(m.text());
});
const shot = async (name) => {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
};
const open = async (path, { w = 1440, h = 900 } = {}) => {
  await page.setViewport({ width: w, height: h });
  await page.goto(`${WEB}${path}`, { waitUntil: 'networkidle0', timeout: 180000 });
  await page.waitForSelector('.hdr', { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
};
const text = (sel) => page.$eval(sel, (e) => e.textContent ?? '');
const path = () => new URL(page.url()).pathname;
const supporters = async () => (await api('/settings/public')).data?.supportersCount;
const fill = async (name, value) => {
  await page.click(`[name="${name}"]`, { clickCount: 3 });
  await page.type(`[name="${name}"]`, value);
};
const click = (sel) => page.$eval(sel, (e) => e.click());
const waitPath = (re) =>
  page.waitForFunction(
    (src) => new RegExp(src).test(location.pathname),
    { timeout: 30000 },
    re.source
  );

/** Fill the donation form on /donate and go to the test checkout. */
const donate = async ({ preset = 360, monthly = false, name = null, dedication = '' }) => {
  await open('/donate?lang=ru');
  await page.waitForSelector('[data-donation-form]', { timeout: 30000 });
  await click(`[data-preset="${preset}"]`);
  if (monthly) await click('[data-recurring="monthly"]');
  if (name) await fill('donorName', name);
  else await click('[data-anonymous="yes"]');
  if (dedication) await fill('dedication', dedication);
  await fill('email', 'smoke07@example.com');
  await click('[data-donation-form] input[name="consent"]');
  await click('[data-donation-form] button[type="submit"]');
  await waitPath(/^\/dev-pay\//);
  await page.waitForSelector('[data-dev-pay]', { timeout: 30000 });
};

let token = null;
let tempEventId = null;
let paidEventId = null;
try {
  const creds = adminCreds();
  if (creds) {
    const login = await api('/admin/login', {
      method: 'POST',
      body: { email: creds[0], password: creds[1] },
    });
    token = login.data?.token ?? null;
  }
  check(!!token, 'admin login for the temporary event');

  // --- /donate: the living page ---
  await open('/donate?lang=ru');
  await page.waitForSelector('[data-donation-form]', { timeout: 30000 });
  check((await page.$$('.don-hero .rosette--spin')).length === 1, 'donate: spinning rosette');
  check((await page.$$('[data-preset]')).length === 6, 'donate: 6 presets');
  check(!!(await page.$('[data-requisites]')), 'donate: requisites block');
  check(!!(await page.$('[data-supporters-count]')), 'donate: supporters counter');
  check(
    !!(await page.$('.don-marquee .marquee')) || !!(await page.$('[data-dedications-empty]')),
    'donate: dedications ticker (or its empty state)'
  );
  await shot('donate-ru-1440');

  // empty e-mail / consent -> banner, no navigation (client-side amount is valid, the server answers 400)
  await click('[data-donation-form] button[type="submit"]');
  await page.waitForSelector('[data-donation-form] [data-banner]', { timeout: 15000 });
  check(path() === '/donate', 'donate: invalid form stays on the page');

  // --- donation -> pay -> thanks (paid), counter +1 ---
  const before = await supporters();
  await donate({ preset: 360, dedication: 'Смоук: за здоровье близких' });
  check(/360/.test(await text('[data-dev-pay] [data-amount]')), 'dev-pay: amount 360');
  await shot('dev-pay-ru');
  await click('.dev-pay__pay');
  await waitPath(/^\/thanks\//);
  await page.waitForSelector('[data-status="paid"]', { timeout: 30000 });
  check(true, 'thanks: paid');
  await shot('thanks-paid-ru');
  const afterPaid = await supporters();
  check(afterPaid === before + 1, 'counter +1 after paid', `${before} -> ${afterPaid}`);

  // --- donation -> cancel ---
  await donate({ preset: 180 });
  await click('.dev-pay__cancel');
  await waitPath(/^\/thanks\//);
  await page.waitForSelector('[data-status="canceled"]', { timeout: 30000 });
  check(true, 'thanks: canceled');
  check((await supporters()) === afterPaid, 'counter unchanged after cancel');

  // --- monthly -> paid -> cancel the subscription ---
  await donate({ preset: 540, monthly: true, name: 'Смоук Тестов' });
  await click('.dev-pay__pay');
  await waitPath(/^\/thanks\//);
  await page.waitForSelector('[data-subscription="active"]', { timeout: 30000 });
  check(true, 'thanks: monthly subscription active');
  await click('.don-cancel-recurring');
  await page.waitForSelector('[data-subscription="canceled"]', { timeout: 30000 });
  check(true, 'thanks: monthly subscription canceled');

  // --- free event registration ---
  if (token) {
    const created = await api('/admin/events', {
      method: 'POST',
      token,
      body: {
        title: { ru: 'Смоук-событие 07' },
        description: { ru: 'Временное событие смоука оплаты, удаляется в конце.' },
        startsAt: new Date(Date.now() + 20 * 864e5).toISOString(),
        isPaid: false,
        priceTiers: [],
        status: 'published',
      },
    });
    tempEventId = created.data?.id ?? null;
    check(!!tempEventId, 'temporary free event created', String(created.status));
    if (tempEventId) {
      await open(`/events/${created.data.slug}?lang=ru#register`);
      await page.waitForSelector('[data-event-registration] form', { timeout: 30000 });
      await fill('name', 'Смоук Гость');
      await fill('phone', '+7 900 000-00-00');
      await fill('email', 'smoke07@example.com');
      await click('[data-event-registration] input[name="consent"]');
      await click('[data-event-registration] button[type="submit"]');
      await page.waitForSelector('[data-event-registration] [data-accepted]', { timeout: 30000 });
      check(!(await page.$('[data-payment-slot]')), 'free event: registered, no payment block');
      await shot('event-registered-ru');
    }

    // --- paid event: «seats × today's price» is visible before checkout ---
    const paid = await api('/admin/events', {
      method: 'POST',
      token,
      body: {
        title: { ru: 'Смоук-событие 07 (платное)' },
        description: { ru: 'Временное платное событие смоука оплаты, удаляется в конце.' },
        startsAt: new Date(Date.now() + 20 * 864e5).toISOString(),
        isPaid: true,
        priceTiers: [{ until: null, priceRub: 700 }],
        status: 'published',
      },
    });
    paidEventId = paid.data?.id ?? null;
    check(!!paidEventId, 'temporary paid event created', String(paid.status));
    if (paidEventId) {
      await open(`/events/${paid.data.slug}?lang=ru#register`);
      await page.waitForSelector('[data-event-registration] form', { timeout: 30000 });
      await fill('name', 'Смоук Гость');
      await fill('phone', '+7 900 000-00-00');
      await fill('email', 'smoke07@example.com');
      await page.focus('[name="seats"]');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('[name="seats"]', '2');
      await click('[data-event-registration] input[name="consent"]');
      await click('[data-event-registration] button[type="submit"]');
      await page.waitForSelector('[data-payment-slot="event"] [data-event-total]', {
        timeout: 30000,
      });
      const total = await page.$eval('[data-event-total]', (e) =>
        e.getAttribute('data-event-total')
      );
      check(
        total === '1400',
        'paid event: 2 seats × 700 = 1400 shown before checkout',
        String(total)
      );
      await shot('event-paid-total-ru');
    }
  }

  // --- en / he ---
  await open('/donate?lang=en');
  await page.waitForSelector('[data-donation-form]', { timeout: 30000 });
  check(/Support the community/.test(await text('h1')), 'EN: donate title');
  await shot('donate-en-1440');
  await open('/donate?lang=he');
  await page.waitForSelector('[data-donation-form]', { timeout: 30000 });
  check((await page.evaluate(() => document.documentElement.dir)) === 'rtl', 'HE: rtl');
  check(/בקהילה/.test(await text('h1')), 'HE: donate title');
  await shot('donate-he-1440');

  // --- 390 ---
  for (const lang of ['ru', 'he']) {
    await open(`/donate?lang=${lang}`, { w: 390, h: 844 });
    await page.waitForSelector('[data-donation-form]', { timeout: 30000 });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(sw <= 390, `390px ${lang}: no horizontal scroll`, String(sw));
    await shot(`donate-${lang}-390`);
  }

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, `smoke crashed: ${e.message}`);
} finally {
  for (const id of [tempEventId, paidEventId]) {
    if (!token || !id) continue;
    const del = await api(`/admin/events/${id}`, { method: 'DELETE', token });
    console.log(`temporary event deleted: ${del.status}`);
  }
  await browser.close();
  stopServers();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL OK');
process.exit(failures.length ? 1 : 0);
