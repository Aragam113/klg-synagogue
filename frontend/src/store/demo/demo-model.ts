import type { Day, Moment, TodayInfo } from '@/store/api/calendar';

/** Kaliningrad has been UTC+2 all year since 2014 (no DST) — the same constant the backend relies on. */
const KLD_OFFSET_MS = 2 * 3600_000;

/** 'YYYY-MM-DD' in Kaliningrad for an instant. */
export const kaliningradDate = (now: Date): string =>
  new Date(now.getTime() + KLD_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Local 'YYYY-MM-DD' + 'HH:MM' (Kaliningrad) → Moment with the UTC instant. */
const momentOf = (date: string, time: string | null): Moment | null => {
  if (!time) return null;
  const at = new Date(Date.parse(`${date}T${time}:00Z`) - KLD_OFFSET_MS).toISOString();
  return { date, time, at };
};

/**
 * GET /calendar/today computed on the client from the snapshot days (mirrors CalendarService.getToday):
 * today by Kaliningrad date, the next two candle lightings after `now`, the coming Shabbat.
 * null — today is outside the snapshot (the calendar data is stale).
 */
export function todayFromDays(days: Day[], now: Date): TodayInfo | null {
  const todayDate = kaliningradDate(now);
  const today = days.find((d) => d.date === todayDate);
  if (!today) return null;
  const ahead = days.filter((d) => d.date >= addDays(todayDate, -1));
  const nextCandles = ahead
    .map((d) => momentOf(d.date, d.candleLighting))
    .filter((m): m is Moment => !!m && Date.parse(m.at) > now.getTime())
    .slice(0, 2);
  const sat = days.find((d) => d.date >= todayDate && d.weekday === 6);
  const fri = sat ? days.find((d) => d.date === addDays(sat.date, -1)) : undefined;
  return {
    today,
    nextCandles,
    nextShabbat: {
      candles: fri ? momentOf(fri.date, fri.candleLighting) : null,
      havdalah: sat ? momentOf(sat.date, sat.havdalah) : null,
      parasha: sat?.parasha ?? null,
    },
  };
}

export type DemoError = 'forms_disabled' | 'calendar_stale' | 'not_found';
export type DemoResult = { data: unknown } | { error: DemoError };
export type DemoLoad = (file: string) => Promise<unknown>;
export interface DemoRequest {
  url: string;
  method?: string;
  params?: Record<string, unknown>;
}

/**
 * Snapshot layout under `public/demo-data/` (written by `scripts/demo-snapshot.mjs`):
 *   <lang>/news.json, events.json, events-past.json, fundraisers.json, programs.json, departments.json,
 *   albums.json, settings.json, days.json — full lists (the client pages and cuts them);
 *   <lang>/{news,events,fundraisers,albums}/<slugFile>.json — single items;
 *   <lang>/holidays/<key>.json (current year) and <key>-<year>.json; dedications.json; meta.json.
 * `slugFile` is duplicated in the snapshot script — keep both in sync.
 */
export const slugFile = (slug: string): string => encodeURIComponent(slug).replace(/%/g, '_');

const DETAIL = /^\/(news|events|fundraisers|albums)\/([^/]+)$/;
const HOLIDAY = /^\/calendar\/holidays\/([^/]+)$/;
const DAYS_DEFAULT = 14;

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined =>
  v === undefined || v === null || v === '' ? undefined : String(v);
const int = (v: unknown, def: number): number => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
};

function paged(all: Row[], params: Record<string, unknown>, defLimit: number) {
  const page = int(params.page, 1);
  const limit = Math.min(int(params.limit, defLimit), 50);
  const items = all.slice((page - 1) * limit, page * limit);
  return { items, total: all.length, page, limit, hasMore: page * limit < all.length };
}

const SEARCH: { type: string; file: string; text: string[]; url: (r: Row) => string }[] = [
  { type: 'news', file: 'news', text: ['title', 'lead'], url: (r) => `/news/${r.slug}` },
  {
    type: 'event',
    file: 'events',
    text: ['title', 'description', 'place'],
    url: (r) => `/events/${r.slug}`,
  },
  {
    type: 'fundraiser',
    file: 'fundraisers',
    text: ['title', 'body'],
    url: (r) => `/fundraisers/${r.slug}`,
  },
  {
    type: 'program',
    file: 'programs',
    text: ['title', 'audience', 'schedule'],
    url: () => '/programs',
  },
  {
    type: 'department',
    file: 'departments',
    text: ['title', 'description', 'address'],
    url: () => '/departments',
  },
];

/** Search in the demo: substring over the snapshot lists (titles and short texts), in the API's result shape. */
async function search(q: string, lang: string, load: DemoLoad) {
  const needle = q.trim().toLowerCase();
  const items: Row[] = [];
  if (needle.length < 2) return { q, items };
  for (const s of SEARCH) {
    const rows = ((await load(`${lang}/${s.file}.json`).catch(() => [])) ?? []) as Row[];
    for (const r of rows) {
      const texts = s.text.map((k) => (typeof r[k] === 'string' ? (r[k] as string) : ''));
      if (!texts.some((t) => t.toLowerCase().includes(needle))) continue;
      const snippet = texts.slice(1).find(Boolean) ?? '';
      items.push({
        type: s.type,
        id: r.id,
        slug: (r.slug as string | undefined) ?? null,
        title: r.title,
        snippet: snippet.length > 160 ? `${snippet.slice(0, 157)}…` : snippet,
        url: s.url(r),
        fallback: r.fallback === true,
      });
    }
  }
  return { q, items };
}

async function days(
  lang: string,
  params: Record<string, unknown>,
  load: DemoLoad,
  now: Date
): Promise<DemoResult> {
  const all = (await load(`${lang}/days.json`)) as Day[];
  const from = str(params.from) ?? kaliningradDate(now);
  const to = str(params.to) ?? addDays(from, DAYS_DEFAULT - 1);
  const cut = all.filter((d) => d.date >= from && d.date <= to);
  return cut.length ? { data: cut } : { error: 'calendar_stale' };
}

/**
 * The demo build's answer to an API request (`url` without the /api/v1 prefix, `params.lang` set):
 * public GETs come from the static snapshot, everything that would send or change something is refused.
 */
export async function demoResponse(
  req: DemoRequest,
  load: DemoLoad,
  now: Date
): Promise<DemoResult> {
  const method = (req.method ?? 'GET').toUpperCase();
  const params = req.params ?? {};
  const lang = str(params.lang) ?? 'ru';
  const url = req.url.split('?')[0].replace(/\/+$/, '') || '/';
  if (method !== 'GET' || /^\/?(admin|payments\/(?!mode)|recurring|requests)/.test(url))
    return { error: 'forms_disabled' };
  const file = (name: string) => load(`${lang}/${name}.json`);
  try {
    switch (url) {
      case '/news': {
        const all = (await file('news')) as Row[];
        const kind = str(params.kind);
        return { data: paged(kind ? all.filter((n) => n.kind === kind) : all, params, 9) };
      }
      case '/events':
        return {
          data: paged((await file(params.past ? 'events-past' : 'events')) as Row[], params, 12),
        };
      case '/fundraisers':
      case '/programs':
      case '/departments':
      case '/albums':
        return { data: await file(url.slice(1)) };
      case '/settings/public':
        return { data: await file('settings') };
      case '/dedications':
        return {
          data: ((await load('dedications.json')) as Row[]).slice(0, int(params.limit, 20)),
        };
      case '/payments/mode':
        return { data: { mode: 'real' } };
      case '/search':
        return { data: await search(str(params.q) ?? '', lang, load) };
      case '/calendar/days':
        return await days(lang, params, load, now);
      case '/calendar/today': {
        const today = todayFromDays((await file('days')) as Day[], now);
        return today ? { data: today } : { error: 'calendar_stale' };
      }
    }
    const detail = DETAIL.exec(url);
    if (detail)
      return { data: await file(`${detail[1]}/${slugFile(decodeURIComponent(detail[2]))}`) };
    const holiday = HOLIDAY.exec(url);
    if (holiday) {
      const key = slugFile(decodeURIComponent(holiday[1]));
      const year = str(params.year);
      return { data: await file(`holidays/${key}${year ? `-${year}` : ''}`) };
    }
  } catch {
    return { error: 'not_found' };
  }
  return { error: 'not_found' };
}
