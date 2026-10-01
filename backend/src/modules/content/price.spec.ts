import { currentPrice, currentTierIndex } from './price';

describe('currentPrice — лестница цен', () => {
  const ladder = {
    isPaid: true,
    priceTiers: [
      { until: '2026-10-10', priceRub: 500 },
      { until: '2026-10-20', priceRub: 700 },
      { until: null, priceRub: 900 },
    ],
  };

  it('до первой ступени — первая цена', () => {
    expect(currentPrice(ladder, new Date('2026-10-01T09:00:00Z'))).toBe(500);
  });

  it('в последний день ступени (включительно, по Калининграду) — её цена', () => {
    // 2026-10-10 23:30 по Калининграду (UTC+2) = 21:30 UTC
    expect(currentPrice(ladder, new Date('2026-10-10T21:30:00Z'))).toBe(500);
    // 2026-10-11 00:30 по Калининграду
    expect(currentPrice(ladder, new Date('2026-10-10T22:30:00Z'))).toBe(700);
  });

  it('между ступенями — следующая цена', () => {
    expect(currentPrice(ladder, new Date('2026-10-15T12:00:00Z'))).toBe(700);
  });

  it('после всех датированных ступеней — бессрочная', () => {
    expect(currentPrice(ladder, new Date('2026-12-01T12:00:00Z'))).toBe(900);
  });

  it('все ступени истекли — последняя', () => {
    const dated = {
      isPaid: true,
      priceTiers: [
        { until: '2026-01-01', priceRub: 300 },
        { until: '2026-02-01', priceRub: 400 },
      ],
    };
    expect(currentPrice(dated, new Date('2026-10-01T12:00:00Z'))).toBe(400);
  });

  it('бесплатное событие или без ступеней — null («вход свободный»)', () => {
    expect(
      currentPrice({ ...ladder, isPaid: false }, new Date('2026-10-01'))
    ).toBeNull();
    expect(
      currentPrice({ isPaid: true, priceTiers: [] }, new Date('2026-10-01'))
    ).toBeNull();
  });
});

describe('currentTierIndex — какая ступень действует (для подсветки на фронте)', () => {
  const ladder = {
    isPaid: true,
    priceTiers: [
      { until: '2026-10-10', priceRub: 500 },
      { until: '2026-10-20', priceRub: 500 },
      { until: null, priceRub: 900 },
    ],
  };
  it('граница суток по Калининграду, а не по UTC (одинаковые цены не путаются)', () => {
    // 2026-10-10 22:30 UTC = 2026-10-11 00:30 по Калининграду → вторая ступень
    expect(currentTierIndex(ladder, new Date('2026-10-10T22:30:00Z'))).toBe(1);
    expect(currentTierIndex(ladder, new Date('2026-10-10T21:30:00Z'))).toBe(0);
  });
  it('все сроки прошли — последняя; бесплатное — null', () => {
    const closed = {
      isPaid: true,
      priceTiers: [
        { until: '2026-01-01', priceRub: 1 },
        { until: '2026-02-01', priceRub: 2 },
      ],
    };
    expect(currentTierIndex(closed, new Date('2026-10-01T09:00:00Z'))).toBe(1);
    expect(
      currentTierIndex({ ...ladder, isPaid: false }, new Date())
    ).toBeNull();
  });
});
