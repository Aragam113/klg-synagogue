/**
 * Link crawler: walks every internal link of the site from the home page in real Chrome and reports broken ones.
 *
 *   npm run crawl:links -- [url=https://aragam113.github.io/klg-synagogue/] [--langs ru,en,he] [--per 3] [--json out.json]
 *
 * The base path is the path of the start URL (`/klg-synagogue/` on GitHub Pages, `/` in dev).
 * For every link found (menu, footer, buttons, cards, breadcrumbs, prev/next, links in content) it records:
 *  (a) HTTP status of the document — on Pages a deep link comes back as 404 + 404.html, which is fine
 *      as long as the app then renders the page;
 *  (b) what actually rendered: the app's «Page not found» or content;
 *  (c) whether the href leaves the base path (e.g. https://aragam113.github.io/visit).
 * Static pages are all visited; dynamic ones (news/events/albums/holidays/prayers/…) — up to `--per` per route.
 * Each language runs in its own incognito context, started with `?lang=<lang>` (the app remembers it).
 * Env: CHROME_PATH, CRAWL_TABS (parallel tabs, default 4). Exit code 1 when anything is broken.
 */
import { writeFileSync } from 'node:fs';

import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
const START = new URL(positional[0] ?? 'https://aragam113.github.io/klg-synagogue/');
const BASE = START.pathname.endsWith('/') ? START.pathname : `${START.pathname}/`;
const LANGS = opt('langs', 'ru,en,he').split(',');
const PER = Number(opt('per', 3));
const JSON_OUT = opt('json');
const SEARCH = ['экскурсии', 'молитва', 'праздник', 'музей', 'synagogue', 'kaddish'];
const TABS = Number(process.env.CRAWL_TABS ?? 3);
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const NOT_FOUND = ['Страница не найдена', 'Page not found', 'הדף לא נמצא'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Route pattern of an in-base path: dynamic segments collapse to `[x]` so instances can be capped. */
const DYNAMIC = /^(news|events|gallery|holidays|prayers|fundraisers|thanks|dev-pay)$/;
const pattern = (rel) => {
  const seg = rel.split('/').filter(Boolean);
  if (seg.length === 2 && DYNAMIC.test(seg[0])) return `/${seg[0]}/[x]`;
  return `/${seg.join('/')}`;
};

/** Key of a page to visit: path (+ query, minus `lang`), without hash. */
const pageKey = (u) => {
  const q = new URLSearchParams(u.search);
  q.delete('lang');
  const s = q.toString();
  return `${u.pathname}${s ? `?${s}` : ''}`;
};

// One browser per worker: parallel tabs of one browser are background tabs, where rendering
// (rAF, IntersectionObserver) stalls and lazily shown content never appears.
const browsers = await Promise.all(
  Array.from({ length: TABS }, () =>
    puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--window-size=1440,900'] }),
  ),
);

const broken = [];
let checked = 0;
let visited = 0;

/** Loads `url` in `page`, waits for the app, returns {status, notFound, links, final}. */
const load = async (page, url) => {
  let status = null;
  // Data requests (API / demo snapshot) in flight: the page is settled only when none are pending.
  const pending = new Set();
  let dataSeen = 0;
  const isData = (req) => ['fetch', 'xhr'].includes(req.resourceType());
  const onReq = (req) => {
    if (isData(req)) {
      pending.add(req);
      dataSeen++;
    }
  };
  const onDone = (req) => pending.delete(req);
  const onResp = (r) => {
    pending.delete(r.request());
    if (r.request().isNavigationRequest() && r.frame() === page.mainFrame() && status === null) status = r.status();
  };
  page.on('request', onReq);
  page.on('requestfailed', onDone);
  page.on('requestfinished', onDone);
  page.on('response', onResp);
  let error = null;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('html[data-app-ready], main h1, h1', { timeout: 20000 }).catch(() => {});
    // Settled = no data request pending and the link set unchanged for ~2 s
    // (and at least 3 s after the shell when the page asked for no data — it may not have started yet).
    const t0 = Date.now();
    let prev = null;
    let same = 0;
    while (Date.now() - t0 < 25000) {
      // Signature of the link set (a count is not enough: a placeholder link may give way to a real one).
      const n = await page.evaluate(
        () =>
          (document.querySelector('h1')?.textContent ?? '') +
          [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).join(' '),
      );
      same = n === prev && pending.size === 0 ? same + 1 : 0;
      if (same >= 6 && (dataSeen > 0 || Date.now() - t0 > 3000)) break;
      prev = n;
      await sleep(350);
    }
  } catch (e) {
    error = String(e.message ?? e).split('\n')[0];
  }
  page.off('response', onResp);
  page.off('request', onReq);
  page.off('requestfailed', onDone);
  page.off('requestfinished', onDone);
  const info = await page
    .evaluate((nf) => {
      const h1 = document.querySelector('h1')?.textContent?.trim() ?? '';
      const text = document.body?.innerText ?? '';
      return {
        h1,
        notFound: nf.some((s) => h1.includes(s)),
        empty: !h1 && text.trim().length < 40,
        links: [...document.querySelectorAll('a[href]')].map((a) => ({
          href: a.getAttribute('href'),
          abs: a.href,
          text: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        })),
        final: location.href,
      };
    }, NOT_FOUND)
    .catch(() => ({ h1: '', notFound: false, empty: true, links: [], final: url }));
  return { status, error, ...info };
};

const crawlLang = async (lang) => {
  const ctxs = await Promise.all(browsers.map((b) => b.createBrowserContext()));
  const pages = await Promise.all(ctxs.map((c) => c.newPage()));
  for (const p of pages) await p.setViewport({ width: 1440, height: 900 });
  // First load fixes the language (persisted by the app).
  const startUrl = new URL(START);
  startUrl.searchParams.set('lang', lang);

  const seen = new Set(); // pageKey
  const perPattern = new Map();
  const sources = new Map(); // pageKey → [{from, href, text}]
  const queue = [{ url: startUrl.href, key: pageKey(startUrl) }];
  seen.add(pageKey(startUrl));
  sources.set(pageKey(startUrl), [{ from: '(start)', href: startUrl.href, text: '' }]);
  const outside = new Map(); // abs → [{from, href, text}]
  const results = new Map(); // pageKey → what went wrong

  /** Records a link to in-site URL `u` and queues the page (capped per dynamic route). */
  const consider = (u, from, href, text) => {
    if (!(u.pathname === BASE.slice(0, -1) || u.pathname.startsWith(BASE))) {
      const k = u.href;
      if (!outside.has(k)) outside.set(k, []);
      outside.get(k).push({ from, href, text });
      return;
    }
    const k = pageKey(u);
    if (!sources.has(k)) sources.set(k, []);
    const list = sources.get(k);
    if (list.length < 5) list.push({ from, href, text });
    if (seen.has(k)) return;
    const pat = pattern(`/${u.pathname.slice(BASE.length)}`);
    const n = perPattern.get(pat) ?? 0;
    if (pat.includes('[x]') && n >= PER) return;
    if (pat.startsWith('/admin') || pat.startsWith('/dev-pay') || pat.startsWith('/_')) return;
    perPattern.set(pat, n + 1);
    seen.add(k);
    const next = new URL(u);
    next.hash = '';
    next.searchParams.set('lang', lang); // tabs start in parallel: do not rely on the remembered language
    queue.push({ url: next.href, key: k });
  };
  // Search results are links too (static pages + content): a few queries as extra entry points.
  for (const q of SEARCH)
    consider(new URL(`${BASE}search?q=${encodeURIComponent(q)}`, START), '(поиск)', `/search?q=${q}`, '');

  const take = async (page) => {
    while (queue.length) {
      const { url, key } = queue.shift();
      const r = await load(page, url);
      visited++;
      const fromRel = key;
      const bad =
        r.error ? `ошибка загрузки: ${r.error}` :
        r.notFound ? `«${r.h1}» (HTTP ${r.status})` :
        r.empty ? `пустая страница (HTTP ${r.status})` :
        r.status !== null && r.status >= 400 && r.status !== 404 ? `HTTP ${r.status}` : null;
      if (bad) {
        results.set(key, bad);
        continue;
      }
      for (const l of r.links) {
        if (!l.href || /^(mailto:|tel:|javascript:|#)/.test(l.href)) continue;
        let u;
        try {
          u = new URL(l.abs);
        } catch {
          continue;
        }
        if (!/^https?:$/.test(u.protocol)) continue;
        if (u.origin !== START.origin) continue; // external site
        checked++;
        consider(u, fromRel, l.href, l.text);
      }
      // Parent of a nested route (/holidays for /holidays/x, /visit/excursions for …/book): people
      // trim the address bar and breadcrumbs point there, so it must be a page too.
      const segs = new URL(r.final).pathname.slice(BASE.length).split('/').filter(Boolean);
      if (segs.length >= 2) {
        const parent = `${BASE}${segs.slice(0, -1).join('/')}`;
        consider(new URL(parent, START), fromRel, parent, '(родительский путь)');
      }
    }
  };
  // Workers: keep pulling until the queue stays empty while nobody is loading.
  let active = 0;
  await Promise.all(
    pages.map(async (p, i) => {
      await sleep(i * 300);
      for (;;) {
        if (queue.length) {
          active++;
          await take(p);
          active--;
        } else if (active === 0) break;
        else await sleep(200);
      }
    }),
  );
  for (const [key, bad] of results)
    for (const s of sources.get(key) ?? []) broken.push({ lang, from: s.from, href: s.href, text: s.text, result: bad });
  for (const [abs, list] of outside)
    for (const s of list.slice(0, 5))
      broken.push({ lang, from: s.from, href: s.href, text: s.text, result: `уходит за ${BASE}: ${abs}` });
  console.log(`[${lang}] страниц: ${seen.size}, шаблоны: ${[...perPattern.keys()].length}`);
  if (process.env.VERBOSE) console.log([...seen].sort().join('\n'));
  await Promise.all(ctxs.map((c) => c.close()));
};

for (const lang of LANGS) await crawlLang(lang);
await Promise.all(browsers.map((b) => b.close()));

// Report: one row per (from, href, result), grouped by result.
const uniq = new Map();
for (const b of broken) {
  const k = `${b.from}|${b.href}|${b.result}`;
  const prev = uniq.get(k);
  if (prev) prev.langs.add(b.lang);
  else uniq.set(k, { ...b, langs: new Set([b.lang]) });
}
const rows = [...uniq.values()].sort((a, b) => a.result.localeCompare(b.result) || a.href.localeCompare(b.href));
console.log(`\nстарт: ${START.href}  база: ${BASE}`);
console.log(`ссылок проверено: ${checked}, страниц открыто: ${visited}, битых (уникальных откуда+href): ${rows.length}`);
if (rows.length) {
  console.log('\n| языки | откуда | href | текст | что получилось |\n|---|---|---|---|---|');
  for (const r of rows)
    console.log(`| ${[...r.langs].join(',')} | ${r.from} | ${r.href} | ${r.text} | ${r.result} |`);
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(rows.map((r) => ({ ...r, langs: [...r.langs] })), null, 2));
process.exit(rows.length ? 1 : 0);
