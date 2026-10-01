import type { Day } from '@/store/api/calendar';
import { demoResponse, todayFromDays } from '@/store/demo/demo-model';

/** Minimal day: only the fields the demo calendar reads matter here. */
const day = (date: string, weekday: number, extra: Partial<Day> = {}): Day =>
  ({
    date,
    weekday,
    hebrewDate: '',
    services: null,
    candleLighting: null,
    havdalah: null,
    parasha: null,
    holidays: [],
    zmanim: {} as Day['zmanim'],
    note: null,
    closed: false,
    ...extra,
  }) as Day;

// Week of 2026-10-05 (Mon) … 2026-10-10 (Sat). Kaliningrad = UTC+2 all year.
const week: Day[] = [
  day('2026-10-05', 1),
  day('2026-10-06', 2),
  day('2026-10-07', 3),
  day('2026-10-08', 4),
  day('2026-10-09', 5, { candleLighting: '18:19' }),
  day('2026-10-10', 6, { havdalah: '19:31', parasha: 'Bereshit' }),
  day('2026-10-11', 0),
  day('2026-10-16', 5, { candleLighting: '18:05' }),
];

describe('todayFromDays (GET /calendar/today in the demo)', () => {
  it('takes today by Kaliningrad date and the next candles / Shabbat after now', () => {
    // 2026-10-08 23:30 UTC = 2026-10-09 01:30 in Kaliningrad → «today» is Friday
    const res = todayFromDays(week, new Date('2026-10-08T23:30:00Z'));
    expect(res).not.toBeNull();
    expect(res!.today.date).toBe('2026-10-09');
    expect(res!.nextCandles).toEqual([
      { date: '2026-10-09', time: '18:19', at: '2026-10-09T16:19:00.000Z' },
      { date: '2026-10-16', time: '18:05', at: '2026-10-16T16:05:00.000Z' },
    ]);
    expect(res!.nextShabbat).toEqual({
      candles: { date: '2026-10-09', time: '18:19', at: '2026-10-09T16:19:00.000Z' },
      havdalah: { date: '2026-10-10', time: '19:31', at: '2026-10-10T17:31:00.000Z' },
      parasha: 'Bereshit',
    });
  });

  it('skips candles already lit today', () => {
    const res = todayFromDays(week, new Date('2026-10-09T17:00:00Z'));
    expect(res!.nextCandles.map((m) => m.date)).toEqual(['2026-10-16']);
  });

  it('returns null when today is outside the snapshot (stale calendar)', () => {
    expect(todayFromDays(week, new Date('2027-03-01T10:00:00Z'))).toBeNull();
  });
});

describe('demoResponse (baseQuery of the demo build: snapshot instead of the network)', () => {
  const news = Array.from({ length: 20 }, (_, i) => ({
    slug: `n${i + 1}`,
    title: i === 4 ? 'Ханука в общине' : `Новость ${i + 1}`,
    lead: null,
    kind: i % 2 ? 'announcement' : 'news',
  }));
  const files: Record<string, unknown> = {
    'ru/news.json': news,
    'en/news/n3.json': { slug: 'n3', title: 'News 3' },
    'ru/days.json': week,
    'ru/events.json': [],
    'ru/fundraisers.json': [],
    'ru/programs.json': [],
    'ru/departments.json': [],
    'dedications.json': [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  };
  const load = async (file: string) => {
    if (!(file in files)) throw new Error(`missing ${file}`);
    return files[file];
  };
  const now = new Date('2026-10-06T09:00:00Z');
  const get = (url: string, params: Record<string, unknown> = {}) =>
    demoResponse({ url, params: { lang: 'ru', ...params } }, load, now);

  it('never sends forms, payments or admin calls', async () => {
    expect(
      await demoResponse(
        { url: '/requests/prayer', method: 'POST', params: { lang: 'ru' } },
        load,
        now
      )
    ).toEqual({ error: 'forms_disabled' });
    expect(await get('/admin/news')).toEqual({ error: 'forms_disabled' });
    expect(await get('/payments/0b6c/x', { token: 't' })).toEqual({ error: 'forms_disabled' });
  });

  it('pages the news list like the API (9 per page by default, kind filter)', async () => {
    expect(await get('/news', { page: '2' })).toEqual({
      data: { items: news.slice(9, 18), total: 20, page: 2, limit: 9, hasMore: true },
    });
    const ann = (await get('/news', { kind: 'announcement', limit: '3' })) as {
      data: { items: { slug: string }[]; total: number };
    };
    expect(ann.data.items.map((n) => n.slug)).toEqual(['n2', 'n4', 'n6']);
    expect(ann.data.total).toBe(10);
  });

  it('reads a single news item of the request language; unknown slug → not_found', async () => {
    expect(await get('/news/n3', { lang: 'en' })).toEqual({
      data: { slug: 'n3', title: 'News 3' },
    });
    expect(await get('/news/nope')).toEqual({ error: 'not_found' });
  });

  it('cuts calendar days by from/to (14 days from today by default); past the snapshot → calendar_stale', async () => {
    const def = (await get('/calendar/days')) as { data: Day[] };
    expect(def.data.map((d) => d.date)).toEqual(week.slice(1).map((d) => d.date));
    const range = (await get('/calendar/days', { from: '2026-10-07', to: '2026-10-09' })) as {
      data: Day[];
    };
    expect(range.data.map((d) => d.date)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09']);
    expect(await get('/calendar/days', { from: '2027-05-01', to: '2027-05-31' })).toEqual({
      error: 'calendar_stale',
    });
    const today = (await get('/calendar/today')) as { data: { today: Day } };
    expect(today.data.today.date).toBe('2026-10-06');
  });

  it('searches the snapshot on the client', async () => {
    expect(await get('/search', { q: 'ханук' })).toEqual({
      data: {
        q: 'ханук',
        items: [
          {
            type: 'news',
            id: undefined,
            slug: 'n5',
            title: 'Ханука в общине',
            snippet: '',
            url: '/news/n5',
            fallback: false,
          },
        ],
      },
    });
  });

  it('limits dedications', async () => {
    expect(await get('/dedications', { limit: 2 })).toEqual({ data: [{ id: 'a' }, { id: 'b' }] });
  });
});
