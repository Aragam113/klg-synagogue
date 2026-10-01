/**
 * Smoke of content pages in real Chrome: news -> news item, events -> event (#register),
 * gallery -> album -> lightbox, search, empty states, he/RTL. Needs the backend with the seeded DB (`npm run seed`).
 *
 *   npm run smoke:content
 *
 * Uses running Expo web (WEB_URL, default :8081) and backend (:3000) or starts them and stops them at the end.
 * A temporary published event is created through the admin API and deleted at the end
 * (admin from SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD or the "Dev-админ" comment in backend/.env).
 * Env: WEB_URL, API_URL (http://localhost:3000/api/v1), CHROME_PATH, SMOKE_SHOTS=<dir for screenshots>.
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
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(s.pid), '/T', '/F'], { stdio: 'ignore' });
    else s.kill('SIGTERM');
  }
};

const adminCreds = () => {
  if (process.env.SMOKE_ADMIN_EMAIL) return [process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD];
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
  if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text());
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
const count = (sel) => page.$$eval(sel, (els) => els.length);
const text = (sel) => page.$eval(sel, (e) => e.textContent ?? '');
const path = () => new URL(page.url()).pathname;

let token = null;
let tempEventId = null;
try {
  // --- temporary event via admin API ---
  const creds = adminCreds();
  if (creds) {
    const login = await api('/admin/login', { method: 'POST', body: { email: creds[0], password: creds[1] } });
    token = login.data?.token ?? null;
  }
  check(!!token, 'admin login for the temporary event');
  if (token) {
    const in30 = new Date(Date.now() + 30 * 864e5);
    const tierDate = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
    const created = await api('/admin/events', {
      method: 'POST',
      token,
      body: {
        title: { ru: 'Смоук-событие 04' },
        description: { ru: 'Временное событие смоука, удаляется в конце.' },
        startsAt: in30.toISOString(),
        isPaid: true,
        priceTiers: [
          { until: tierDate, priceRub: 500 },
          { until: null, priceRub: 700 },
        ],
        status: 'published',
      },
    });
    tempEventId = created.data?.id ?? null;
    check(created.status < 300 && !!tempEventId, 'temporary event created', String(created.status));
  }

  // --- news -> news item ---
  await open('/news?lang=ru');
  await page.waitForSelector('[data-testid="news-list"] .card', { timeout: 30000 });
  check((await count('[data-testid="news-list"] .card')) >= 1, 'news: feed has cards');
  check(/Новости/.test(await text('h1')), 'news: RU title');
  check((await count('[data-testid="news-list"] .card__media img')) >= 1, 'news: cards have covers');
  await shot('news-1440');
  await page.click('[data-testid="news-list"] .card');
  await page.waitForSelector('[data-testid="news-item"] h1', { timeout: 30000 });
  check(/^\/news\/[\w-]+$/.test(path()), 'news: card opens /news/<slug>', path());
  check((await text('[data-testid="news-item"] .cnt-body')).length > 20, 'news item: body text');
  check((await count('[data-testid="news-item"] .arch img')) === 1, 'news item: cover in ArchFrame');
  await shot('news-item-1440');
  await open('/news/no-such-news?lang=ru');
  await sleep(800);
  check((await count('.empty')) === 1, 'news item: 404 -> empty state');

  // --- news feed "load more" + Telegram post: gallery, lightbox, source ---
  const feed = await api('/news?limit=50');
  if (feed.data?.total > 9) {
    await open('/news?lang=ru');
    await page.waitForSelector('[data-testid="news-list"] .card', { timeout: 30000 });
    const before = await count('[data-testid="news-list"] .card');
    await page.click('.cnt-loadmore button');
    await page.waitForFunction(
      (n) => document.querySelectorAll('[data-testid="news-list"] .card').length > n,
      { timeout: 30000 },
      before
    );
    check((await count('[data-testid="news-list"] .card')) > before, 'news: load more appends cards', before);
  }
  let post = null;
  for (const it of feed.data?.items ?? []) {
    const d = (await api(`/news/${it.slug}?lang=ru`)).data;
    if (d?.sourceUrl && d.images?.length > 1) {
      post = d;
      break;
    }
  }
  if (post) {
    for (const lang of ['ru', 'he']) {
      await open(`/news/${post.slug}?lang=${lang}`, { w: 390, h: 844 });
      await page.waitForSelector('[data-testid="news-photos"] .cnt-photo', { timeout: 30000 });
      const n = await count('[data-testid="news-photos"] .cnt-photo');
      check(n === post.images.length, `post ${lang}: gallery has all images`, `${n}/${post.images.length}`);
      const src = await page.$eval('[data-testid="news-source"] a', (a) => a.href);
      check(src === post.sourceUrl, `post ${lang}: source link to the post`, src);
      const firstLine = (await text('[data-testid="news-item"] .cnt-body')).trim().split('\n')[0];
      check(!firstLine.includes(post.title), `post ${lang}: title not repeated in body`, firstLine.slice(0, 60));
      if (lang === 'he')
        check(
          (await count('[data-testid="news-item"] [dir="auto"] .cnt-body')) === 1,
          'post he: Russian fallback text has dir=auto'
        );
      const letters = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
      const shownLead = (await count('[data-testid="news-item"] .lead'))
        ? await text('[data-testid="news-item"] .lead')
        : '';
      const bodyText = await text('[data-testid="news-item"] .cnt-body');
      check(
        !shownLead || !letters(bodyText).startsWith(letters(shownLead)),
        `post ${lang}: lead does not repeat the body start`,
        shownLead ? 'lead shown' : 'lead hidden'
      );
      const noScroll = await page.evaluate(() => document.documentElement.scrollWidth <= 390);
      check(noScroll, `post ${lang}: 390px without horizontal scroll`);
      await shot(`news-post-${lang}-390`);
      await page.click('[data-testid="news-photos"] .cnt-photo');
      await page.waitForSelector('[data-testid="lightbox"]', { timeout: 10000 });
      const c1 = await text('.lbx__count');
      await page.keyboard.press(lang === 'he' ? 'ArrowLeft' : 'ArrowRight');
      await sleep(200);
      check((await text('.lbx__count')) !== c1, `post ${lang}: lightbox steps`, await text('.lbx__count'));
      await page.keyboard.press('Escape');
      await sleep(200);
      check((await count('[data-testid="lightbox"]')) === 0, `post ${lang}: lightbox closes`);
    }
  }

  // --- events (ink + grain) -> event -> #register ---
  await open('/events?lang=ru');
  check((await count('.tone-ink.sec--grain')) >= 1, 'events: afisha on ink with grain');
  if (tempEventId) {
    await page.waitForSelector('[data-testid="events-upcoming"] .card', { timeout: 30000 });
    await shot('events-1440');
    await page.click('[data-testid="events-upcoming"] .card');
    await page.waitForSelector('[data-testid="event-item"]', { timeout: 30000 });
    check(/^\/events\/[\w-]+$/.test(path()), 'events: card opens /events/<slug>', path());
    const href = await page.$eval('[data-testid="event-register-link"]', (a) => a.getAttribute('href'));
    check(/^\/events\/[\w-]+#register$/.test(href ?? ''), 'event: register button -> #register', href);
    check((await count('#register')) === 1, 'event: #register anchor exists');
    check((await count('.cnt-ladder li')) === 2, 'event: price ladder with 2 tiers');
    check((await count('.cnt-ladder li[data-state="current"]')) === 1, 'event: current tier from API highlighted');
    check(/500/.test(await text('.cnt-price')), 'event: price for today = first tier', await text('.cnt-price'));
    await page.click('[data-testid="event-register-link"]');
    await sleep(1200);
    const top = await page.$eval('#register', (e) => e.getBoundingClientRect().top);
    check(top < 900 && new URL(page.url()).hash === '#register', 'event: click scrolls to #register', String(top));
    await shot('event-1440');
  }

  // --- gallery -> album -> lightbox ---
  await open('/gallery?lang=ru');
  await page.waitForSelector('.cnt-album', { timeout: 30000 });
  check((await count('.cnt-album .arch img')) >= 1, 'gallery: albums in ArchFrame');
  await shot('gallery-1440');
  await page.click('.cnt-album');
  await page.waitForSelector('.cnt-photo', { timeout: 30000 });
  check(/^\/gallery\/[\w-]+$/.test(path()), 'gallery: album opens /gallery/<slug>', path());
  const nPhotos = await count('.cnt-photo');
  check(nPhotos >= 1, 'album: photos', String(nPhotos));
  check((await count('.cnt-credits li')) >= 1, 'album: photo credits');
  await page.click('.cnt-photo');
  await page.waitForSelector('[data-testid="lightbox"]', { timeout: 5000 });
  check(/^1 из/.test(await text('.lbx__count')), 'lightbox: opens on photo 1', await text('.lbx__count'));
  check(await page.evaluate(() => document.documentElement.style.overflow === 'hidden'), 'lightbox: page scroll locked');
  await shot('lightbox-1440');
  if (nPhotos > 1) {
    await page.keyboard.press('ArrowRight');
    await sleep(150);
    check(/^2 из/.test(await text('.lbx__count')), 'lightbox: ArrowRight -> next', await text('.lbx__count'));
    await page.click('.lbx__prev');
    await sleep(150);
    check(/^1 из/.test(await text('.lbx__count')), 'lightbox: prev button');
  }
  await page.keyboard.press('Escape');
  await sleep(200);
  check((await count('[data-testid="lightbox"]')) === 0, 'lightbox: Esc closes');
  check(await page.evaluate(() => document.documentElement.style.overflow === ''), 'lightbox: scroll unlocked');

  // --- search ---
  await open(`/search?lang=ru&q=${encodeURIComponent('музей')}`);
  await page.waitForSelector('[data-testid="search-hits"] li', { timeout: 30000 });
  check(/Музей/.test(await text('[data-testid="search-hits"]')), 'search: API hit (department)');
  check(/Подразделения/.test(await text('[data-testid="search-pages"]')), 'search: static page by keyword');
  await page.$eval('[data-testid="search-hits"] li a', (a) => a.scrollIntoView({ block: 'center' }));
  await sleep(300);
  await page.click('[data-testid="search-hits"] li a');
  await page.waitForFunction(() => location.pathname !== '/search', { timeout: 10000 }).catch(() => {});
  check(path() === '/departments', 'search: hit opens its page', path());
  await page.waitForSelector('[data-testid="departments"] .card', { timeout: 30000 });
  check((await count('[data-testid="departments"] .card')) >= 1, 'departments: cards');
  await open('/search?lang=ru');
  await page.type('[data-testid="search-input"]', 'zzqqxx');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-testid="search-empty"]', { timeout: 30000 });
  check(new URL(page.url()).searchParams.get('q') === 'zzqqxx', 'search: query goes to the address');
  check((await count('[data-testid="search-empty"] a')) >= 3, 'search: empty -> links to sections');
  await shot('search-empty-1440');

  // --- programs ---
  await open('/programs?lang=ru');
  await page.waitForSelector('[data-testid="programs"] .card', { timeout: 30000 });
  check((await count('[data-testid="programs"] .card')) >= 1, 'programs: cards');

  // --- HE / RTL + fallback badge; EN ---
  await open('/news?lang=he');
  await page.waitForSelector('[data-testid="news-list"] .card', { timeout: 30000 });
  const he = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    h1: document.querySelector('h1')?.textContent ?? '',
    badge: document.querySelector('[data-testid="news-list"] .badge')?.textContent ?? '',
  }));
  check(he.dir === 'rtl' && /[\u0590-\u05FF]/.test(he.h1), 'HE: RTL and Hebrew title', JSON.stringify(he));
  check(he.badge.length > 0, 'HE: untranslated news has the fallback badge', he.badge);
  await shot('news-he-1440');
  await open('/gallery?lang=en');
  await page.waitForSelector('.cnt-album', { timeout: 30000 });
  check(/Gallery|Photos/.test(await text('main, body')), 'EN: gallery in English');

  // --- mobile 390 ---
  await open('/departments?lang=ru', { w: 390, h: 844 });
  await page.waitForSelector('[data-testid="departments"] .card', { timeout: 30000 });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 390, '390px: no horizontal scroll', String(sw));
  await shot('departments-390');

  check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
} catch (e) {
  check(false, `smoke crashed: ${e.message}`);
} finally {
  if (token && tempEventId) {
    const del = await api(`/admin/events/${tempEventId}`, { method: 'DELETE', token });
    console.log(`temporary event deleted: ${del.status}`);
  }
  await browser.close();
  stopServers();
}

console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL OK');
process.exit(failures.length ? 1 : 0);
