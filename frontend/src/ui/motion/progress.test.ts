import { progressOf } from '@/ui/motion/progress';

describe('progressOf through', () => {
  it('is 0 when the top just enters the viewport bottom and 1 when the bottom leaves the top', () => {
    expect(progressOf({ top: 900, height: 600 }, 900, 'through')).toBe(0);
    expect(progressOf({ top: -600, height: 600 }, 900, 'through')).toBe(1);
    expect(progressOf({ top: 2000, height: 600 }, 900, 'through')).toBe(0);
    expect(progressOf({ top: 150, height: 600 }, 900, 'through')).toBe(0.5);
  });
});

describe('progressOf pin', () => {
  it('runs 0..1 while a tall container scrolls by', () => {
    expect(progressOf({ top: 0, height: 2700 }, 900, 'pin')).toBe(0);
    expect(progressOf({ top: -900, height: 2700 }, 900, 'pin')).toBe(0.5);
    expect(progressOf({ top: -1800, height: 2700 }, 900, 'pin')).toBe(1);
    expect(progressOf({ top: -5000, height: 2700 }, 900, 'pin')).toBe(1);
  });
  it('is a step (0 before, 1 after the top passes) when height <= viewport', () => {
    expect(progressOf({ top: 10, height: 900 }, 900, 'pin')).toBe(0);
    expect(progressOf({ top: -0.5, height: 900 }, 900, 'pin')).toBe(1);
    expect(progressOf({ top: -0.5, height: 400 }, 900, 'pin')).toBe(1);
  });
});
