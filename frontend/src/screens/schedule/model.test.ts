import {
  countdown,
  countdownText,
  monthRange,
  nextCandle,
  serviceLabelKey,
} from '@/screens/schedule/model';

describe('countdown', () => {
  it('splits the remaining time to the candle lighting into d/h/m/s', () => {
    const now = Date.parse('2026-11-11T10:00:00Z');
    // 13.11 14:21Z − 11.11 10:00Z = 2 д 4 ч 21 мин 0 с
    expect(countdown('2026-11-13T14:21:00.000Z', now)).toEqual({ d: 2, h: 4, m: 21, s: 0 });
    expect(countdown('2026-11-11T10:00:05.000Z', now)).toEqual({ d: 0, h: 0, m: 0, s: 5 });
  });
  it('is null once the moment has passed', () => {
    expect(countdown('2026-11-11T09:59:59.000Z', Date.parse('2026-11-11T10:00:00Z'))).toBeNull();
  });
});

describe('monthRange', () => {
  it('covers the whole month, including February of a leap year', () => {
    expect(monthRange(2026, 11)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});

describe('serviceLabelKey', () => {
  it('Friday evening service is named the community way — «Встреча Шаббата»', () => {
    expect(serviceLabelKey('maariv', 5)).toBe('col.kabbalatShabbat');
    expect(serviceLabelKey('maariv', 3)).toBe('col.maariv');
    expect(serviceLabelKey('shacharit', 5)).toBe('col.shacharit');
  });
});

describe('nextCandle + countdownText (shared by the home page and TodayWidget)', () => {
  const now = Date.parse('2026-10-01T10:00:00Z');
  const list = [
    { date: '2026-09-25', time: '18:40', at: '2026-09-25T16:40:00Z' },
    { date: '2026-10-02', time: '18:20', at: '2026-10-02T12:03:04Z' },
  ];
  it('skips candles already lit and counts down to the next one', () => {
    const n = nextCandle(list, now);
    expect(n?.date).toBe('2026-10-02');
    expect(n?.left).toEqual({ d: 1, h: 2, m: 3, s: 4 });
    expect(nextCandle(list.slice(0, 1), now)).toBeNull();
  });
  it('renders «1 д 02 ч 03 мин 04 с», days only when there are any', () => {
    const u = { d: 'д', h: 'ч', m: 'мин', s: 'с' };
    expect(countdownText({ d: 1, h: 2, m: 3, s: 4 }, u)).toBe('1 д 02 ч 03 мин 04 с');
    expect(countdownText({ d: 0, h: 5, m: 0, s: 9 }, u)).toBe('05 ч 00 мин 09 с');
  });
});
