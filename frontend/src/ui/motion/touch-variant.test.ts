import { approach, DEFAULT_TOUCH_VARIANT, parseTouchVariant, timedProgress } from './touch-variant';

describe('parseTouchVariant', () => {
  it('reads ?a=1|2|3 from the query', () => {
    expect(parseTouchVariant('?a=1', null)).toBe(1);
    expect(parseTouchVariant('?lang=ru&a=3', null)).toBe(3);
    expect(parseTouchVariant('a=2', null)).toBe(2);
  });
  it('falls back to the remembered choice, then to the default', () => {
    expect(parseTouchVariant('', '3')).toBe(3);
    expect(parseTouchVariant('?a=9', '1')).toBe(1);
    expect(parseTouchVariant('', null)).toBe(DEFAULT_TOUCH_VARIANT);
    expect(parseTouchVariant('?a=x', 'junk')).toBe(DEFAULT_TOUCH_VARIANT);
  });
  it('the query wins over the remembered choice', () => {
    expect(parseTouchVariant('?a=2', '1')).toBe(2);
  });
});

describe('approach (frame-rate independent lerp)', () => {
  it('moves 18% of the gap in one 60 Hz frame', () => {
    expect(approach(0, 1, 0.18, 1000 / 60)).toBeCloseTo(0.18, 5);
  });
  it('two 60 Hz frames equal one 30 Hz frame', () => {
    const two = approach(approach(0, 1, 0.18, 1000 / 60), 1, 0.18, 1000 / 60);
    expect(approach(0, 1, 0.18, 1000 / 30)).toBeCloseTo(two, 5);
  });
  it('snaps to the target when the gap is below 5e-4', () => {
    expect(approach(0.9996, 1, 0.18, 16)).toBe(1);
    expect(approach(0.5, 0.5, 0.18, 16)).toBe(0.5);
  });
});

describe('timedProgress (ease-out by time)', () => {
  it('goes from `from` to `to` over the duration and stays there', () => {
    expect(timedProgress(0, 3000, 0.15, 0.72)).toBeCloseTo(0.15, 5);
    expect(timedProgress(3000, 3000, 0.15, 0.72)).toBeCloseTo(0.72, 5);
    expect(timedProgress(9000, 3000, 0, 1)).toBe(1);
  });
  it('is past the linear midpoint at half time (ease-out)', () => {
    expect(timedProgress(1500, 3000, 0, 1)).toBeGreaterThan(0.5);
  });
});
