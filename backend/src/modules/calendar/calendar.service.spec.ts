import { Location, Zmanim } from '@hebcal/core';
import { CalendarService, nightfall } from './calendar.service';
import { HAVDALAH_FALLBACK_MINUTES } from './calendar.config';
import type { ServiceTimes } from './entities';

function minutesApart(a: string | null, b: string): number {
  if (!a) return Infinity;
  const m = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
  return Math.abs(m(a) - m(b));
}

const EMPTY: ServiceTimes = { shacharit: null, mincha: null, maariv: null };

/** Сервис на фейковых репозиториях: шаблон и исключения задаются в тесте. */
function makeService(
  template = { id: 1, weekday: EMPTY, friday: EMPTY, shabbat: EMPTY },
  overrides: Record<string, unknown>[] = []
): CalendarService {
  const templateRepo = { findOneBy: async () => template };
  const overrideRepo = { find: async () => overrides };
  return new CalendarService(templateRepo as never, overrideRepo as never);
}

/*
 * Известные значения посчитаны независимо — REST hebcal.com (01.10.2026):
 *   /shabbat?cfg=json&latitude=54.70568333&longitude=20.51555278&tzid=Europe/Kaliningrad&b=18&M=on&gy=2026&gm=11&gd=13
 *     → «Candle lighting: 4:21pm» 2026-11-13, «Havdalah: 5:37pm» 2026-11-14, «Parashat Toldot»
 *   /converter?cfg=json&date=2026-11-13&g2h=1 → 3 Kislev 5787
 */
describe('CalendarService — Калининград', () => {
  it('пятница 13.11.2026: свечи 16:21, исход 17:37, глава Толдот, 3 кислева 5787', async () => {
    const days = await makeService().getDays('2026-11-13', '2026-11-14', 'ru');
    const [fri, sat] = days;
    expect(fri.date).toBe('2026-11-13');
    expect(fri.weekday).toBe(5);
    expect(fri.candleLighting).toBe('16:21');
    expect(fri.hebrewDate).toBe('3 кислева 5787');
    expect(sat.havdalah).toBe('17:37');
    expect(sat.parasha).toBe('Толдот');

    const en = await makeService().getDays('2026-11-14', '2026-11-14', 'en');
    expect(en[0].parasha).toBe('Toldot');
    expect(en[0].hebrewDate).toBe('4 Kislev 5787');
  });

  // hebcal.com /shabbat … gd=20 → «Candle lighting: 4:10pm» 2026-11-20; «Havdalah: 5:37pm» 2026-11-14
  it('today в среду 11.11.2026: два ближайших зажигания и ближайший Шаббат', async () => {
    const now = new Date('2026-11-11T10:00:00Z');
    const info = await makeService().getToday('ru', now);
    expect(info.today.date).toBe('2026-11-11');
    expect(info.nextCandles.map((c) => `${c.date} ${c.time}`)).toEqual([
      '2026-11-13 16:21',
      '2026-11-20 16:10',
    ]);
    expect(new Date(info.nextCandles[0].at).toISOString()).toBe(
      '2026-11-13T14:21:00.000Z'
    );
    expect(info.nextShabbat.havdalah?.time).toBe('17:37');
    expect(info.nextShabbat.parasha).toBe('Толдот');
  });

  it('Ханука 2026 (с вечера 04.12) — в днях как ссылка, на странице праздника есть даты', async () => {
    const days = await makeService().getDays('2026-12-04', '2026-12-06', 'ru');
    for (const d of days) {
      expect(d.holidays).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'chanukah', link: true }),
        ])
      );
    }
    const page = makeService().getHoliday('chanukah', 'ru', 2026);
    expect(page.dates.map((x) => x.date)).toEqual(
      expect.arrayContaining(['2026-12-05', '2026-12-12'])
    );
  });

  it('страница праздника включает вечер/канун первого дня (как /calendar/days)', () => {
    // 2026: Песах с вечера 01.04, Шавуот 21.05, Пурим 02.03, Тиша бе-Ав 22.07,
    // Рош а-Шана 11.09, Йом Кипур 20.09, Суккот 25.09, Ханука 04.12
    const eve: Record<string, string> = {
      pesach: '2026-04-01',
      shavuot: '2026-05-21',
      purim: '2026-03-02',
      'tisha-bav': '2026-07-22',
      'rosh-hashana': '2026-09-11',
      'yom-kippur': '2026-09-20',
      sukkot: '2026-09-25',
      chanukah: '2026-12-04',
    };
    for (const [key, date] of Object.entries(eve)) {
      const dates = makeService()
        .getHoliday(key, 'ru', 2026)
        .dates.map((x) => x.date);
      expect({ key, first: dates[0] }).toEqual({ key, first: date });
    }
  });

  // hebcal.com /converter: 2026-09-21 → events ["Yom Kippur"]
  it('isClosedForVisits: суббота и Йом Кипур — закрыто, обычная среда — открыто', () => {
    const s = makeService();
    expect(s.isClosedForVisits('2026-11-14')).toBe(true);
    expect(s.isClosedForVisits('2026-09-21')).toBe(true);
    expect(s.isClosedForVisits('2026-11-11')).toBe(false);
  });

  // hebcal.com /converter: 2020-11-13 → 26 Cheshvan 5781; 26 Cheshvan 5787 → 2026-11-06
  it('hebrewAnniversary: смерть 13.11.2020 → годовщина 06.11.2026', () => {
    expect(makeService().hebrewAnniversary('2020-11-13', 2026)).toBe(
      '2026-11-06'
    );
  });

  it('пустой шаблон → services null; шаблон и исключение на дату меняют выдачу', async () => {
    const empty = await makeService().getDays('2026-11-13', '2026-11-14', 'ru');
    expect(empty.map((d) => d.services)).toEqual([null, null]);

    const shabbat = { shacharit: '10:00', mincha: null, maariv: null };
    const svc = makeService({ id: 1, weekday: EMPTY, friday: EMPTY, shabbat }, [
      {
        date: '2026-11-13',
        shacharit: null,
        mincha: '15:30',
        maariv: null,
        note: { ru: 'Пост' },
      },
    ]);
    const [fri, sat] = await svc.getDays('2026-11-13', '2026-11-14', 'ru');
    expect(fri.services).toEqual({
      shacharit: null,
      mincha: '15:30',
      maariv: null,
    });
    expect(fri.note).toBe('Пост');
    expect(sat.services).toEqual(shabbat);
  });

  /*
   * Белые ночи: на 54.7° солнце летом не опускается на 16.1° (алот а-шахар),
   * но 8.5° достигает всегда (max погружение 90 − 54.7 − 23.44 ≈ 11.9°).
   * hebcal.com /shabbat … gy=2027&gm=6&gd=18 → «Candle lighting: 8:59pm» 2027-06-18,
   *   «Havdalah: 10:51pm» 2027-06-19 (UTC+2).
   */
  it('19.06.2027 (белые ночи): алот null, свечи 20:59, исход 22:51', async () => {
    const [fri, sat] = await makeService().getDays(
      '2027-06-18',
      '2027-06-19',
      'ru'
    );
    // hebcal.com (core 6.x) и закреплённый 5.10.1 расходятся в округлении на минуту.
    expect(minutesApart(fri.candleLighting, '20:59')).toBeLessThanOrEqual(1);
    expect(minutesApart(sat.havdalah, '22:51')).toBeLessThanOrEqual(1);
    expect(sat.zmanim.alot).toBeNull();
    expect(sat.zmanim.tzet).toBe(sat.havdalah);
    expect(sat.zmanim.sunrise).toMatch(/^\d{2}:\d{2}$/);
  });

  // Санкт-Петербург 59.94°: в июне солнце не уходит на 8.5° — выход звёзд по запасному правилу.
  it('nightfall: где 8.5° не наступает — закат + запасной интервал', () => {
    const spb = new Location(59.94, 30.31, false, 'Europe/Moscow', 'SPb', 'RU');
    const z = new Zmanim(spb, new Date(2027, 5, 19), false);
    expect(Number.isNaN(z.tzeit(8.5).getTime())).toBe(true);
    const at = nightfall(z);
    expect(at).not.toBeNull();
    expect((at!.getTime() - z.shkiah().getTime()) / 60_000).toBe(72);
    expect(HAVDALAH_FALLBACK_MINUTES).toBe(72);
  });
});
