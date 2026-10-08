import { demoPlan, kldDate } from './demo-mock.data';

const DAY = 86_400_000;
// 8 октября 2026, полдень по Калининграду; ближайшая Ханука — свечи вечером 4 декабря 2026 (пт) → первая не-пятница: 6 декабря
const NOW = new Date('2026-10-08T10:00:00Z');

describe('demoPlan', () => {
  const { events, fundraisers } = demoPlan(NOW);

  it('5–6 будущих событий в ближайшие ~2,5 месяца, все slug demo-*, не в Шаббат', () => {
    expect(events.length).toBeGreaterThanOrEqual(5);
    expect(events.length).toBeLessThanOrEqual(6);
    for (const e of events) {
      expect(e.slug.startsWith('demo-')).toBe(true);
      expect(e.startsAt.getTime()).toBeGreaterThan(NOW.getTime());
      expect(e.startsAt.getTime() - NOW.getTime()).toBeLessThan(80 * DAY);
      const wd = new Date(`${kldDate(e.startsAt)}T00:00:00Z`).getUTCDay();
      expect([5, 6]).not.toContain(wd);
    }
  });

  it('праздник — ближайшая Ханука по hebcal', () => {
    const h = events.find((e) => e.slug === 'demo-prazdnik');
    expect(h?.title.ru).toMatch(/Ханука/);
    expect(kldDate(h!.startsAt)).toBe('2026-12-06');
  });

  it('есть бесплатное с лимитом мест и платное с лестницей из 3 ступеней', () => {
    expect(events.some((e) => !e.isPaid && e.capacity)).toBe(true);
    const concert = events.find((e) => e.slug === 'demo-koncert')!;
    expect(concert.priceTiers.map((t) => t.priceRub)).toEqual([500, 700, 1000]);
    expect(concert.priceTiers[concert.priceTiers.length - 1].until).toBeNull();
  });

  it('сборы ~20 %, ~65 %, почти закрыт и один закрытый; платежи входят в собранное', () => {
    const pct = fundraisers.map((f) =>
      Math.round((f.raisedRub / f.goalRub) * 100)
    );
    expect(pct).toEqual([20, 65, 97, 100]);
    expect(fundraisers.map((f) => f.status)).toEqual([
      'active',
      'active',
      'active',
      'closed',
    ]);
    for (const f of fundraisers) {
      expect(f.slug.startsWith('demo-')).toBe(true);
      expect(f.payments.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(
        f.raisedRub
      );
      expect(f.payments.length).toBeLessThanOrEqual(f.supporters);
    }
  });
});
