import {
  addDays,
  kaliningradDate,
  kaliningradDayStart,
  kaliningradTime,
} from './kaliningrad-time';

// Калининград — UTC+2 круглый год (ожидания разобраны вручную).
describe('kaliningrad-time', () => {
  it('kaliningradDate: после 22:00 UTC — уже следующий день, месяц и год', () => {
    expect(kaliningradDate(new Date('2026-10-01T21:59:59Z'))).toBe(
      '2026-10-01'
    );
    expect(kaliningradDate(new Date('2026-10-01T22:00:00Z'))).toBe(
      '2026-10-02'
    );
    expect(kaliningradDate(new Date('2026-10-31T22:30:00Z'))).toBe(
      '2026-11-01'
    );
    expect(kaliningradDate(new Date('2026-12-31T23:00:00Z'))).toBe(
      '2027-01-01'
    );
  });

  it('kaliningradTime: HH:MM по Калининграду, полночь — 00:00', () => {
    expect(kaliningradTime(new Date('2026-10-01T22:00:00Z'))).toBe('00:00');
    expect(kaliningradTime(new Date('2027-01-15T09:05:00Z'))).toBe('11:05');
  });

  it('kaliningradDayStart: полночь дня по Калининграду = 22:00 UTC накануне (летом и зимой)', () => {
    expect(kaliningradDayStart('2026-10-02').toISOString()).toBe(
      '2026-10-01T22:00:00.000Z'
    );
    expect(kaliningradDayStart('2027-01-01').toISOString()).toBe(
      '2026-12-31T22:00:00.000Z'
    );
    expect(kaliningradDayStart('2026-07-01').toISOString()).toBe(
      '2026-06-30T22:00:00.000Z'
    );
  });

  it('addDays: через границу месяца и високосный февраль', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});
