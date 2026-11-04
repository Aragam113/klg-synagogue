import type { Day } from '@/store/api/calendar';

import { candleBlocks } from './candles-model';

const Z = {
  alot: null,
  talit: '06:42',
  sunrise: '07:51',
  shma: '10:02',
  tfila: '10:48',
  chatzot: '12:21',
  shkia: '16:52',
  tzet: '17:31',
};

const day = (date: string, weekday: number, extra: Partial<Day> = {}): Day => ({
  date,
  hebrewDate: '',
  weekday,
  services: null,
  candleLighting: null,
  candleAfter: false,
  havdalah: null,
  fastBegins: null,
  fastEnds: null,
  parasha: null,
  holidays: [],
  zmanim: Z,
  note: null,
  closed: weekday === 6,
  source: 'chabad',
  ...extra,
});

describe('candleBlocks', () => {
  it('Шаббат: свечи в пятницу, исход в субботу — один блок с главой', () => {
    const b = candleBlocks([
      day('2026-11-05', 4),
      day('2026-11-06', 5, { candleLighting: '16:34' }),
      day('2026-11-07', 6, { havdalah: '17:47', parasha: 'Хаей Сара' }),
      day('2026-11-13', 5, { candleLighting: '16:21' }),
    ]);
    expect(b).toHaveLength(2);
    expect(b[0].parasha).toBe('Хаей Сара');
    expect(b[0].lines.map((l) => `${l.kind} ${l.time}`)).toEqual([
      'candles 16:34',
      'havdalah 17:47',
    ]);
    expect(b[1].lines).toHaveLength(1);
  });

  it('Песах, переходящий в Шаббат: одна цепочка до исхода, свечи «после» отмечены', () => {
    const yt = (name: string) => [{ key: 'pesach', name, link: true, yomTov: true }];
    const b = candleBlocks([
      day('2027-04-21', 3, { candleLighting: '19:35' }),
      day('2027-04-22', 4, { candleLighting: '20:56', candleAfter: true, holidays: yt('Песах I') }),
      day('2027-04-23', 5, { candleLighting: '19:38', holidays: yt('Песах II') }),
      day('2027-04-24', 6, { havdalah: '21:00' }),
      day('2027-04-27', 2, { candleLighting: '20:05' }),
    ]);
    expect(b).toHaveLength(2);
    expect(b[0].holidays).toEqual(['Песах I', 'Песах II']);
    expect(b[0].lines.map((l) => `${l.kind}${l.after ? '+after' : ''} ${l.time}`)).toEqual([
      'candles 19:35',
      'candles+after 20:56',
      'candles 19:38',
      'havdalah 21:00',
    ]);
  });

  it('начало с середины Шаббата: одиночный исход не показываем; лимит блоков', () => {
    const b = candleBlocks(
      [
        day('2026-11-07', 6, { havdalah: '17:47' }),
        day('2026-11-13', 5, { candleLighting: '16:21' }),
        day('2026-11-14', 6, { havdalah: '17:36', source: 'hebcal' }),
        day('2026-11-20', 5, { candleLighting: '16:10' }),
      ],
      1
    );
    expect(b).toHaveLength(1);
    expect(b[0].date).toBe('2026-11-13');
    expect(b[0].fallback).toBe(true);
  });
});
