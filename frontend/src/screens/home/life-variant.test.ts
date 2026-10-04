import { lifeVariant } from './model';

describe('lifeVariant (?life= on the home page, phone layout of «Community life»)', () => {
  it('defaults to 1 when the parameter is missing or unknown', () => {
    expect(lifeVariant(undefined)).toBe(1);
    expect(lifeVariant('')).toBe(1);
    expect(lifeVariant('3')).toBe(1);
    expect(lifeVariant('big')).toBe(1);
  });
  it('accepts 1 and 2, also from an array param', () => {
    expect(lifeVariant('1')).toBe(1);
    expect(lifeVariant('2')).toBe(2);
    expect(lifeVariant(['2'])).toBe(2);
  });
});
