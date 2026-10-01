import type { TodayInfo } from '@/store/api/calendar';

import { todayBlock } from './model';

const day = (date: string) => ({
  date,
  hebrewDate: '10 Тишрея 5787',
  weekday: 4,
  services: null,
  candleLighting: null,
  havdalah: null,
  parasha: null,
  holidays: [],
  zmanim: {} as TodayInfo['today']['zmanim'],
  note: null,
  closed: false,
});

describe('todayBlock — живой блок «Сегодня» на главной', () => {
  const now = Date.parse('2026-10-01T10:00:00Z');
  const info: TodayInfo = {
    today: day('2026-10-01'),
    nextCandles: [
      { date: '2026-09-25', time: '18:40', at: '2026-09-25T16:40:00Z' },
      { date: '2026-10-02', time: '18:20', at: '2026-10-02T12:03:04Z' },
    ],
    nextShabbat: { candles: null, havdalah: null, parasha: 'Берешит' },
  };

  it('часы Калининграда (UTC+2), обе даты, ближайшие свечи с ещё не прошедшим временем и отсчёт до них', () => {
    const b = todayBlock(info, now, 'ru');
    expect(b.clock).toBe('12:00:00');
    expect(b.hebrew).toBe('10 Тишрея 5787');
    expect(b.gregorian).toContain('1 октября');
    expect(b.candles).toEqual({ date: '2026-10-02', time: '18:20' });
    expect(b.left).toEqual({ d: 1, h: 2, m: 3, s: 4 });
    expect(b.parasha).toBe('Берешит');
  });

  it('все свечи в прошлом → без отсчёта, блок не падает', () => {
    const b = todayBlock({ ...info, nextCandles: [info.nextCandles[0]] }, now, 'en');
    expect(b.candles).toBeNull();
    expect(b.left).toBeNull();
    expect(b.clock).toBe('12:00:00');
  });
});
