import { countdown, kaliningradNow, monthRange, serviceLabelKey } from '@/screens/schedule/model';

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

describe('kaliningradNow', () => {
  it('gives the date and wall clock in Kaliningrad (UTC+2, no DST)', () => {
    // 22:30:07 UTC 1 Oct = 00:30:07 2 Oct in Kaliningrad
    expect(kaliningradNow(Date.parse('2026-10-01T22:30:07Z'))).toEqual({
      date: '2026-10-02',
      time: '00:30:07',
    });
    // winter: still +2
    expect(kaliningradNow(Date.parse('2027-01-15T09:05:00Z'))).toEqual({
      date: '2027-01-15',
      time: '11:05:00',
    });
  });
});

describe('serviceLabelKey', () => {
  it('Friday evening service is named the community way — «Встреча Шаббата»', () => {
    expect(serviceLabelKey('maariv', 5)).toBe('col.kabbalatShabbat');
    expect(serviceLabelKey('maariv', 3)).toBe('col.maariv');
    expect(serviceLabelKey('shacharit', 5)).toBe('col.shacharit');
  });
});
