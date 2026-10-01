#!/usr/bin/env node
/**
 * Snapshot of the public API for the GitHub Pages demo: `npm run demo:snapshot [-- <api-url>]`.
 * Walks a running API (default http://localhost:3000/api/v1, or DEMO_API_URL) and writes every public GET
 * the site needs, on ru/en/he, into `public/demo-data/` (layout — `src/store/demo/demo-model.ts`).
 * Images `/media/*` referenced by the data are copied to `public/demo-data/media/` and the URLs rewritten to
 * `/demo-data/media/*` (the client prefixes the base path). The folder is replaced wholesale.
 */
import { mkdir, rm, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = (process.argv[2] || process.env.DEMO_API_URL || 'http://localhost:3000/api/v1').replace(
  /\/+$/,
  ''
);
const ORIGIN = API.replace(/\/api\/v\d+$/, '');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/demo-data');
const LANGS = ['ru', 'en', 'he'];
const MONTHS_AHEAD = 13;
const WINDOW = 62; // MAX_RANGE_DAYS of the API
// Holidays the yizkor helper asks for by year (src/forms/use-nearest-yizkor.ts).
const YIZKOR_KEYS = ['yom-kippur', 'shmini-atzeret', 'pesach', 'shavuot'];

/** Same as slugFile in src/store/demo/demo-model.ts — keep in sync. */
const slugFile = (slug) => encodeURIComponent(slug).replace(/%/g, '_');

const media = new Set();
const skippedDays = new Set();
let requests = 0;

async function get(p, params = {}) {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const url = `${API}${p}${qs.size ? `?${qs}` : ''}`;
  requests++;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const body = await res.json();
  return body && body.success === true && 'data' in body ? body.data : body;
}

/** JSON text with /media/* rewritten to the snapshot copy; the referenced files are collected. */
function rewrite(data) {
  return JSON.stringify(data).replace(/(["(\s])\/media\/([\w.\-/]+)/g, (_m, pre, file) => {
    media.add(file);
    return `${pre}/demo-data/media/${file}`;
  });
}

async function save(file, data) {
  const full = path.join(OUT, file);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, rewrite(data));
}

async function allPages(p, params = {}) {
  const items = [];
  for (let page = 1; page < 500; page++) {
    const res = await get(p, { ...params, page, limit: 50 });
    items.push(...res.items);
    if (!res.hasMore) break;
  }
  return items;
}

async function pool(list, n, fn) {
  const queue = [...list];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) await fn(queue.shift());
    })
  );
}

const kldToday = () => new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10);
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function details(lang, kind, slugs) {
  await pool(slugs, 6, async (slug) => {
    try {
      await save(`${lang}/${kind}/${slugFile(slug)}.json`, await get(`/${kind}/${encodeURIComponent(slug)}`, { lang }));
    } catch (e) {
      console.warn(`skip ${kind}/${slug}: ${e.message}`);
    }
  });
}

async function snapshotLang(lang, from, to) {
  const news = await allPages('/news', { lang });
  await save(`${lang}/news.json`, news);
  await details(lang, 'news', news.map((n) => n.slug));

  const events = await allPages('/events', { lang });
  const past = await allPages('/events', { lang, past: 1 });
  await save(`${lang}/events.json`, events);
  await save(`${lang}/events-past.json`, past);
  await details(lang, 'events', [...events, ...past].map((e) => e.slug));

  const fundraisers = await get('/fundraisers', { lang });
  await save(`${lang}/fundraisers.json`, fundraisers);
  await details(lang, 'fundraisers', fundraisers.map((f) => f.slug));

  for (const name of ['programs', 'departments']) await save(`${lang}/${name}.json`, await get(`/${name}`, { lang }));
  const albums = await get('/albums', { lang });
  await save(`${lang}/albums.json`, albums);
  await details(lang, 'albums', albums.map((a) => a.slug));
  await save(`${lang}/settings.json`, await get('/settings/public', { lang }));

  const days = [];
  for (let a = from; a <= to; a = addDays(a, WINDOW)) {
    const b = addDays(a, WINDOW - 1) < to ? addDays(a, WINDOW - 1) : to;
    try {
      days.push(...(await get('/calendar/days', { lang, from: a, to: b })));
    } catch {
      // a window the API cannot compute (e.g. summer days without a zman at this latitude) → day by day
      for (let d = a; d <= b; d = addDays(d, 1)) {
        try {
          days.push(...(await get('/calendar/days', { lang, from: d, to: d })));
        } catch {
          skippedDays.add(d);
        }
      }
    }
  }
  await save(`${lang}/days.json`, days);

  const keys = new Set(YIZKOR_KEYS);
  for (const d of days) for (const h of d.holidays) if (h.link) keys.add(h.key);
  const years = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)) + 1; y++) years.push(y);
  const jobs = [...keys].flatMap((key) => [[key, null], ...years.map((y) => [key, y])]);
  await pool(jobs, 6, async ([key, year]) => {
    try {
      const data = await get(`/calendar/holidays/${encodeURIComponent(key)}`, year ? { lang, year } : { lang });
      await save(`${lang}/holidays/${slugFile(key)}${year ? `-${year}` : ''}.json`, data);
    } catch (e) {
      console.warn(`skip holiday ${key} ${year ?? ''}: ${e.message}`);
    }
  });
  return { news: news.length, events: events.length + past.length, days: days.length, holidays: keys.size };
}

async function dirSize(dir) {
  let total = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? await dirSize(p) : (await stat(p)).size;
  }
  return total;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const from = kldToday();
  const to = addDays(from, Math.round(MONTHS_AHEAD * 30.5));
  const stats = {};
  for (const lang of LANGS) stats[lang] = await snapshotLang(lang, from, to);
  await save('dedications.json', await get('/dedications', { limit: 50 }));
  await save('meta.json', { createdAt: new Date().toISOString(), api: API, from, to });

  let failed = 0;
  await pool([...media], 8, async (file) => {
    const res = await fetch(`${ORIGIN}/media/${file}`);
    if (!res.ok) {
      failed++;
      console.warn(`media ${file}: ${res.status}`);
      return;
    }
    const full = path.join(OUT, 'media', file);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, Buffer.from(await res.arrayBuffer()));
  });
  const mb = ((await dirSize(OUT)) / 1048576).toFixed(1);
  console.log(
    `demo snapshot: ${from}…${to}, news ${stats.ru.news}, events ${stats.ru.events}, days ${stats.ru.days}, ` +
      `holidays ${stats.ru.holidays}, media ${media.size - failed}/${media.size}, requests ${requests}, ${mb} MB → ${OUT}`
  );
  if (skippedDays.size) {
    const list = [...skippedDays].sort();
    console.warn(`calendar: API failed on ${list.length} days (${list[0]}…${list.at(-1)}) — not in the snapshot`);
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
