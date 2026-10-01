/**
 * Smoke of the admin UI in real Chrome:
 *   unauthenticated /admin/news -> login; expired token -> login; login form -> back to /admin/news;
 *   create a published news item through the form -> visible on /news -> delete it from the list;
 *   a request from the public form API -> visible in /admin/requests -> status + note saved;
 *   schedule template change -> visible on /schedule (restored after);
 *   settings: requisites -> visible on /donate (restored after);
 *   dedication approval -> visible in GET /dedications; subscribers CSV downloads; logout.
 *
 *   npm run smoke:admin
 *
 * Needs Expo web (WEB_URL, default :8081) and the backend (API_URL, default :3000) - starts them if absent.
 * Admin: SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD or the "Dev-админ" comment in backend/.env.
 * Everything the smoke creates is deleted at the end (requests/payments have no DELETE API - removed via pg
 * with the DB settings from backend/.env). Env: CHROME_PATH, SMOKE_SHOTS=<dir for screenshots>.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from 'puppeteer-core';

const WEB = process.env.WEB_URL ?? 'http://localhost:8081';
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.env.SMOKE_SHOTS;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, '..', 'backend');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAMP = Date.now().toString(36);

const failures = [];
const check = (ok, what, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${what}${extra ? ` (${extra})` : ''}`);
  if (!ok) failures.push(what);
};
const up = async (url) => {
  try {
    const res = await fetch(url);
    return res.status < 500;
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

const envFile = join(BACKEND, '.env');
const envText = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
const envVar = (k) => envText.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
const adminCreds = () => {
  if (process.env.SMOKE_ADMIN_EMAIL) return [process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD];
  const m = envText.match(/Dev-админ[^:]*:\s*(\S+@\S+)\s*\/\s*(\S+)/);
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

/** Rows without a DELETE endpoint (requests, payments) are removed directly. */
const dbDelete = async (table, ids) => {
  if (!ids.length) return;
  const require = createRequire(join(BACKEND, 'package.json'));
  const { Client } = require('pg');
  const db = new Client({
    host: envVar('DB_HOST') ?? 'localhost',
    port: Number(envVar('DB_PORT') ?? 5432),
    user: envVar('DB_USERNAME'),
    password: envVar('DB_PASSWORD'),
    database: envVar('DB_DATABASE'),
  });
  await db.connect();
  try {
    await db.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
  } finally {
    await db.end();
  }
};

await ensure(`${API}/news`, BACKEND, ['nest', 'start']);
await ensure(WEB, ROOT, ['expo', 'start', '--web', '--port', new URL(WEB).port || '8081']);

const creds = adminCreds();
if (!creds) {
  console.error('no admin credentials (SMOKE_ADMIN_EMAIL / Dev-админ in backend/.env)');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--window-size=1366,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
page.on('dialog', (d) => d.accept());
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(String(e)));
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const shot = async (name) => SHOTS && page.screenshot({ path: join(SHOTS, `admin-${name}.png`), fullPage: true });
const go = (path) => page.goto(`${WEB}${path}`, { waitUntil: 'networkidle0', timeout: 180000 });
const path = () => new URL(page.url()).pathname;
const waitPath = async (re, ms = 30000) => {
  for (let i = 0; i < ms / 200 && !re.test(path()); i++) await sleep(200);
  return re.test(path());
};
const waitText = async (selector, text, ms = 30000) => {
  try {
    await page.waitForFunction(
      (s, t) => [...document.querySelectorAll(s)].some((el) => el.textContent.includes(t)),
      { timeout: ms },
      selector,
      text
    );
    return true;
  } catch {
    return false;
  }
};
/** Sets a React-controlled input/textarea value (works for time/date/datetime-local too). */
const setValue = (selector, value) =>
  page.$eval(
    selector,
    (el, v) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    },
    value
  );
const clickText = (selector, text) =>
  page.$$eval(
    selector,
    (els, t) => {
      const el = els.find((e) => e.textContent.trim().includes(t));
      if (el) el.click();
      return !!el;
    },
    text
  );

const created = { news: null, request: null, payment: null };
let createdOverride = null;
let token = null;
let originalTemplate = null;
let originalSettings = null;

try {
  // 1. Guard: no token -> login; expired token -> login with notice.
  await go('/admin/news');
  check(await waitPath(/^\/admin\/login$/), 'unauthenticated /admin/news -> /admin/login', path());
  const expired = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: 'x', exp: 1 })).toString('base64url')}.x`;
  await page.evaluate((t) => localStorage.setItem('synagogue.adminToken', t), expired);
  await go('/admin/settings');
  check(await waitPath(/^\/admin\/login$/), 'expired token -> /admin/login');
  check(await waitText('[data-testid="admin-login"]', 'Сессия истекла'), 'expired notice shown');

  // 2. Login through the form, back to the page we were sent from.
  await go('/admin/login?next=%2Fadmin%2Fnews');
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', creds[0]);
  await page.type('input[name="password"]', 'wrong-password');
  await page.click('[data-testid="admin-login"] button[type="submit"]');
  check(await waitText('[data-testid="admin-login"]', 'Неверный email или пароль'), 'wrong password -> clear error');
  await page.$eval('input[name="password"]', (el) => (el.value = ''));
  await setValue('input[name="password"]', creds[1]);
  await page.click('[data-testid="admin-login"] button[type="submit"]');
  check(await waitPath(/^\/admin\/news$/), 'login -> /admin/news', path());
  token = await page.evaluate(() => localStorage.getItem('synagogue.adminToken'));
  check(!!token, 'token stored');
  await page.waitForSelector('.adm__nav');
  await shot('news-list');

  // 3. Create a published news item through the form.
  const title = `Смоук-новость ${STAMP}`;
  await go('/admin/news/new');
  await page.waitForSelector('[data-testid="edit-news"]');
  await setValue('input[name="title.ru"]', title);
  await setValue('textarea[name="body.ru"]', 'Текст смоук-новости. Удаляется в конце проверки.');
  await page.click('[data-field="title"] [data-lang="en"]');
  await setValue('input[name="title.en"]', `Smoke news ${STAMP}`);
  await page.select('[data-testid="edit-news"] select[name="status"]', 'published');
  // Cover > 10 MB: clear error before upload, input cleared (same file can be picked again).
  const bigFile = join(tmpdir(), `smoke-big-${STAMP}.jpg`);
  writeFileSync(bigFile, Buffer.alloc(10 * 1024 * 1024 + 1));
  const coverInput = await page.$('[data-field="cover"] input[type="file"]');
  await coverInput.uploadFile(bigFile);
  check(await waitText('[data-field="cover"]', 'Файл больше 10 МБ'), 'cover > 10 MB -> clear error before upload');
  check((await coverInput.evaluate((el) => el.value)) === '', 'file input cleared after the attempt');
  rmSync(bigFile, { force: true });
  await page.click('[data-testid="save"]');
  check(await waitPath(/^\/admin\/news\/[0-9a-f-]{36}$/), 'news created -> /admin/news/<id>', path());
  created.news = path().split('/').pop();
  const item = await api(`/admin/news/${created.news}`, { token });
  check(item.data?.title?.en === `Smoke news ${STAMP}` && item.data?.status === 'published', 'news saved with RU+EN, published');
  await shot('news-edit');

  await go('/news');
  check(await waitText('[data-testid="news-list"]', title), 'new news visible on /news');

  await go('/admin/news');
  await page.waitForSelector(`[data-testid="list-news"] [data-id="${created.news}"]`);
  await page.click(`[data-testid="list-news"] [data-id="${created.news}"] .adm-btn--danger`);
  for (let i = 0; i < 50 && (await page.$(`[data-id="${created.news}"]`)); i++) await sleep(200);
  check(!(await page.$(`[data-id="${created.news}"]`)), 'news deleted from the list (after confirm)');
  check((await api(`/admin/news/${created.news}`, { token })).status === 404, 'news gone in API');
  if ((await api(`/admin/news/${created.news}`, { token })).status === 404) created.news = null;

  // 4. A request from the public form shows up in the admin; status + note.
  const reqName = `Смоук ${STAMP}`;
  const req = await api('/requests/help', {
    method: 'POST',
    body: {
      kind: 'material',
      fullName: reqName,
      phone: '+7 900 000-00-00',
      email: 'smoke@example.com',
      birthDate: '1950-03-01',
      address: 'Калининград',
      roots: 'mother',
      situation: 'Проверка админки',
      otherHelp: 'Нет',
      question: 'Смоук',
      consent: true,
    },
  });
  created.request = req.data?.id ?? null;
  check(!!created.request, 'public form request accepted', String(req.status));
  await go('/admin/requests?type=help&status=new');
  check(await waitText('[data-testid="list-requests"]', reqName), 'request visible in /admin/requests (filter help+new)');
  check(!!(await page.$('[data-testid="new-count"]')), 'side menu shows new requests counter');
  await go(`/admin/requests/${created.request}`);
  await page.waitForSelector('[data-testid="request-card"]');
  check(await waitText('[data-testid="request-card"]', 'Проверка админки'), 'request card shows the payload');
  await page.select('select[name="status"]', 'in_progress');
  await setValue('textarea[name="adminNote"]', 'Перезвонить');
  await page.click('[data-testid="save"]');
  check(await waitText('.adm-ok', 'Сохранено'), 'request saved');
  const reqAfter = await api(`/admin/requests/${created.request}`, { token });
  check(reqAfter.data?.status === 'in_progress' && reqAfter.data?.adminNote === 'Перезвонить', 'status + note in API');
  await shot('request');

  // 5. Schedule template -> public /schedule.
  originalTemplate = (await api('/admin/schedule/template', { token })).data;
  await go('/admin/schedule');
  await page.waitForSelector('[data-testid="template"] input[name="weekday.shacharit"]');
  for (const d of ['weekday', 'friday', 'shabbat']) await setValue(`input[name="${d}.shacharit"]`, '06:47');
  await page.click('[data-testid="save-template"]');
  check(await waitText('[data-testid="template"]', 'Сохранено'), 'schedule template saved');
  const tpl = (await api('/admin/schedule/template', { token })).data;
  check(tpl?.weekday?.shacharit === '06:47', 'template in API');
  await go('/schedule');
  check(await waitText('body', '06:47', 40000), 'template time visible on /schedule');

  // 5b. Date overrides beyond the first 62-day window: visible after "Дальше", editable, deletable.
  const farDate = new Date(Date.now() + 100 * 86400_000).toISOString().slice(0, 10);
  const putO = await api(`/admin/schedule/overrides/${farDate}`, {
    method: 'PUT',
    body: { shacharit: '07:11', mincha: null, maariv: null, note: { ru: `Смоук ${STAMP}` } },
    token,
  });
  check(putO.status === 200, 'override on today+100 saved via API', String(putO.status));
  createdOverride = farDate;
  await go('/admin/schedule');
  await page.waitForSelector('[data-testid="override-window"]');
  check(!(await page.$('[data-testid="overrides"] .errorbox')), 'overrides load without range error');
  check(!(await page.$(`[data-date="${farDate}"]`)), 'today+100 is outside the first window');
  await clickText('[data-testid="override-window"] button', 'Дальше');
  await page.waitForSelector(`[data-date="${farDate}"]`, { timeout: 30000 });
  check(true, 'saved override visible after "Дальше"');
  await clickText(`[data-date="${farDate}"] button`, 'Изменить');
  const draftDate = await page.$eval('input[name="override.date"]', (el) => el.value);
  check(draftDate === farDate, 'edit loads the override into the form', draftDate);
  await clickText(`[data-date="${farDate}"] button`, 'Удалить');
  const gone = await page
    .waitForFunction((d) => !document.querySelector(`[data-date="${d}"]`), { timeout: 30000 }, farDate)
    .then(() => true, () => false);
  check(gone, 'override deleted from the list');
  check((await api(`/admin/schedule/overrides/${farDate}`, { token })).status === 404, 'override gone in API');
  if (gone) createdOverride = null;

  // 6. Settings -> requisites on /donate.
  originalSettings = (await api('/admin/settings', { token })).data;
  const requisites = `Реквизиты смоук ${STAMP}`;
  await go('/admin/settings');
  await page.waitForSelector('[data-testid="settings"] textarea[name="requisites.ru"]');
  await setValue('textarea[name="requisites.ru"]', requisites);
  await page.click('[data-testid="save"]');
  check(await waitText('.adm-ok', 'Сохранено'), 'settings saved');
  await go('/donate');
  check(await waitText('body', requisites, 40000), 'requisites visible on /donate');

  // 7. Dedication moderation -> public feed.
  const dedication = `Посвящение смоук ${STAMP}`;
  const pay = await api('/payments', {
    method: 'POST',
    body: {
      purpose: 'donation',
      anonymous: true,
      amountRub: 180,
      email: 'smoke@example.com',
      consent: true,
      dedication,
    },
  });
  created.payment = pay.data?.paymentId ?? null;
  if (created.payment) {
    await api(`/payments/fake/${created.payment}/pay?token=${pay.data.accessToken}`, { method: 'POST' });
  }
  await go('/admin/payments');
  check(await waitText('[data-testid="list-payments"]', dedication), 'payment with dedication listed');
  const shown = await clickText(`[data-testid="list-payments"] [data-id="${created.payment}"] button`, 'Показать');
  check(shown, 'approve dedication button');
  let inFeed = false;
  for (let i = 0; i < 25 && !inFeed; i++) {
    await sleep(200);
    inFeed = ((await api('/dedications?limit=50')).data ?? []).some((d) => d.text === dedication);
  }
  check(inFeed, 'approved dedication in public /dedications');
  await shot('payments');

  // 8. CSV of subscribers downloads (fetch + blob with Bearer).
  await go('/admin/subscribers');
  const csv = await page.evaluate(async (api) => {
    const t = localStorage.getItem('synagogue.adminToken');
    const r = await fetch(`${api}/admin/subscribers.csv`, { headers: { Authorization: `Bearer ${t}` } });
    return { ok: r.ok, type: r.headers.get('content-type') };
  }, API);
  check(csv.ok && /csv/.test(csv.type ?? ''), 'subscribers CSV available with Bearer', csv.type);
  check(!!(await page.$('[data-testid="csv"]')), 'CSV button on subscribers');
  // 401 on CSV (token revoked while the page is open) -> login with "session expired".
  await page.evaluate((t) => localStorage.setItem('synagogue.adminToken', t), `${token.slice(0, -4)}AAAA`);
  await page.click('[data-testid="csv"]');
  check(await waitPath(/^\/admin\/login$/), 'CSV 401 -> /admin/login', path());
  check(await waitText('[data-testid="admin-login"]', 'Сессия истекла'), 'CSV 401 -> expired notice');
  await page.evaluate((t) => localStorage.setItem('synagogue.adminToken', t), token);

  // 9. Phone width: menu collapses, list still usable.
  await page.setViewport({ width: 390, height: 844 });
  await go('/admin/requests');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check(wide, 'no horizontal scroll at 390px');
  await shot('phone');
  await page.setViewport({ width: 1366, height: 900 });

  // 10. Logout.
  await go('/admin/requests');
  await page.click('[data-testid="logout"]');
  check(await waitPath(/^\/admin\/login$/), 'logout -> /admin/login');
  check(!(await page.evaluate(() => localStorage.getItem('synagogue.adminToken'))), 'token cleared');
  check(consoleErrors.length === 0, 'no page errors', consoleErrors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, `unexpected: ${e.message}`);
} finally {
  // Cleanup: everything the smoke created; template and settings restored.
  if (!token) token = (await api('/admin/login', { method: 'POST', body: { email: creds[0], password: creds[1] } })).data?.token;
  if (created.news) await api(`/admin/news/${created.news}`, { method: 'DELETE', token });
  if (createdOverride) await api(`/admin/schedule/overrides/${createdOverride}`, { method: 'DELETE', token });
  if (originalTemplate) {
    const tpl = { ...originalTemplate };
    delete tpl.id;
    const r = await api('/admin/schedule/template', { method: 'PUT', body: tpl, token });
    console.log(`template restored: ${r.status}`);
  }
  if (originalSettings) {
    // null clears a key on the backend, so the original state (with nulls) is restored as is.
    const r = await api('/admin/settings', { method: 'PUT', body: originalSettings, token });
    console.log(`settings restored: ${r.status}`);
  }
  try {
    await dbDelete('payments', created.payment ? [created.payment] : []);
    await dbDelete('requests', created.request ? [created.request] : []);
    console.log('temporary request/payment deleted');
  } catch (e) {
    check(false, `cleanup via pg: ${e.message}`);
  }
  await browser.close();
  stopServers();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nadmin smoke: all OK');
process.exit(failures.length ? 1 : 0);
