import { readFileSync } from 'fs';
import * as path from 'path';
import { CalendarService } from '../calendar.service';
import type { ServiceTimes } from '../entities';
import { parseChabadZmanim, to24h } from './chabad-zmanim.parser';
import { ChabadZmanimService, chabadZmanimUrl } from './chabad-zmanim.service';

/** Ленты Chabad.org, сохранённые 04.11.2026 (город 908 — Калининград). */
const feed = (date: string) =>
  readFileSync(
    path.join(__dirname, '__fixtures__', `zmanim-${date}.xml`),
    'utf8'
  );

describe('to24h', () => {
  it.each([
    ['4:34 PM', '16:34'],
    ['12:37 AM', '00:37'],
    ['12:21 PM', '12:21'],
    ['9:05 am', '09:05'],
    ['46:43 min.', null],
  ])('%s → %s', (src, want) => expect(to24h(src)).toBe(want));
});

describe('parseChabadZmanim', () => {
  it('пятница 06.11.2026: зманим и свечи 16:34', () => {
    const d = parseChabadZmanim(feed('2026-11-06'), '2026-11-06');
    expect(d.zmanim).toEqual({
      alot: '05:54',
      talit: '06:42',
      sunrise: '07:51',
      shma: '10:02',
      tfila: '10:48',
      chatzot: '12:21',
      minchaGedola: '12:45',
      minchaKetana: '15:03',
      plag: '16:00',
      shkia: '16:52',
      tzet: '17:31',
    });
    expect(d.candleLighting).toBe('16:34');
    expect(d.candleAfter).toBe(false);
    expect(d.havdalah).toBeNull();
  });

  it('Шаббат 07.11.2026: исход 17:47, выхода звёзд в ленте нет', () => {
    const d = parseChabadZmanim(feed('2026-11-07'), '2026-11-07');
    expect(d.havdalah).toBe('17:47');
    expect(d.candleLighting).toBeNull();
    expect(d.zmanim.tzet).toBeNull();
  });

  it('Ханука 04.12.2026: плаг и ханукальные свечи в одном пункте', () => {
    const d = parseChabadZmanim(feed('2026-12-04'), '2026-12-04');
    expect(d.zmanim.plag).toBe('15:33');
    expect(d.chanukah).toBe('15:33');
    expect(d.candleLighting).toBe('15:56');
  });

  it('10 тевета 20.12.2026: начало и конец поста', () => {
    const d = parseChabadZmanim(feed('2026-12-20'), '2026-12-20');
    expect(d.fastBegins).toBe('06:50');
    expect(d.zmanim.alot).toBe('06:50');
    expect(d.fastEnds).toBe('16:58');
    expect(d.zmanim.tzet).toBe('16:58');
    expect(d.havdalah).toBeNull();
  });

  it('второй день Песаха 22.04.2027: свечи «после» 20:56', () => {
    const d = parseChabadZmanim(feed('2027-04-22'), '2027-04-22');
    expect(d.candleLighting).toBe('20:56');
    expect(d.candleAfter).toBe(true);
  });

  it('Йом Кипур 10–11.10.2027: свечи + начало поста, исход праздника и поста', () => {
    const eve = parseChabadZmanim(feed('2027-10-10'), '2027-10-10');
    expect(eve.candleLighting).toBe('17:34');
    expect(eve.fastBegins).toBe('17:34');
    const day = parseChabadZmanim(feed('2027-10-11'), '2027-10-11');
    expect(day.havdalah).toBe('18:43');
  });

  it('лента не на ту дату или не RSS — ошибка', () => {
    expect(() => parseChabadZmanim(feed('2026-11-06'), '2026-11-07')).toThrow(
      /вместо 2026-11-07/
    );
    expect(() => parseChabadZmanim('<html>403</html>', '2026-11-06')).toThrow();
  });
});

describe('ChabadZmanimService + CalendarService', () => {
  const EMPTY: ServiceTimes = { shacharit: null, mincha: null, maariv: null };

  function makeChabad(fail = false): ChabadZmanimService {
    const svc = new ChabadZmanimService();
    svc.fetchImpl = (async (url: string) => {
      const date = /tdate=(\d+)\/(\d+)\/(\d+)/.exec(url)!;
      const iso = `${date[3]}-${date[1].padStart(2, '0')}-${date[2].padStart(2, '0')}`;
      if (fail) return new Response('blocked', { status: 403 });
      try {
        return new Response(feed(iso), { status: 200 });
      } catch {
        return new Response('nope', { status: 404 });
      }
    }) as typeof fetch;
    return svc;
  }

  function makeCalendar(chabad?: ChabadZmanimService): CalendarService {
    const template = { id: 1, weekday: EMPTY, friday: EMPTY, shabbat: EMPTY };
    return new CalendarService(
      { findOneBy: async () => template } as never,
      { find: async () => [] } as never,
      chabad
    );
  }

  it('адрес ленты: город 908, tdate M/D/YYYY', () => {
    expect(chabadZmanimUrl('2026-11-06')).toBe(
      'https://www.chabad.org/tools/rss/zmanim.xml?locationid=908&locationtype=1&tdate=11/6/2026'
    );
  });

  it('времена Шаббата 06–07.11.2026 — с Chabad.org', async () => {
    const days = await makeCalendar(makeChabad()).getDays(
      '2026-11-06',
      '2026-11-07',
      'ru'
    );
    const [fri, sat] = days;
    expect(fri.source).toBe('chabad');
    expect(fri.candleLighting).toBe('16:34');
    expect(fri.zmanim.sunrise).toBe('07:51');
    expect(sat.havdalah).toBe('17:47');
    // выхода звёзд на Шаббат в ленте нет — расчёт тем же углом 6°, что у Chabad.org в будни
    expect(sat.zmanim.tzet).toBe('17:29');
  });

  it('Chabad.org недоступен — локальный расчёт hebcal', async () => {
    const days = await makeCalendar(makeChabad(true)).getDays(
      '2026-11-13',
      '2026-11-14',
      'ru'
    );
    expect(days.map((d) => d.source)).toEqual(['hebcal', 'hebcal']);
    expect(days[0].candleLighting).toBe('16:21');
    expect(days[1].havdalah).toBe('17:37');
  });

  it('второй день Песаха 22.04.2027 — свечи «после»', async () => {
    const [d] = await makeCalendar(makeChabad()).getDays(
      '2027-04-22',
      '2027-04-22',
      'ru'
    );
    expect(d.candleLighting).toBe('20:56');
    expect(d.candleAfter).toBe(true);
  });
});
