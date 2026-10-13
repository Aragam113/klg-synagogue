import { approach, easeGlide, snapDuration, snapProgress } from './touch-scroll';

describe('approach (frame-rate independent lerp)', () => {
  it('moves k of the gap in one 60 Hz frame', () => {
    expect(approach(0, 1, 0.2, 1000 / 60)).toBeCloseTo(0.2, 5);
  });
  it('two 60 Hz frames equal one 30 Hz frame', () => {
    const two = approach(approach(0, 1, 0.2, 1000 / 60), 1, 0.2, 1000 / 60);
    expect(approach(0, 1, 0.2, 1000 / 30)).toBeCloseTo(two, 5);
  });
  it('snaps to the target when the gap is below 5e-4', () => {
    expect(approach(0.9996, 1, 0.2, 16)).toBe(1);
  });
});

describe('snapProgress — where a scene resting between two chapters glides (4 chapters)', () => {
  // chapter k shows its text fully over local .2 … .72; the zone between chapters k−1 and k is (k − .28)/4 … (k + .2)/4
  it('resting where a chapter is fully readable → left alone', () => {
    expect(snapProgress(0.1, 4, 1)).toBeNull(); // chapter 1
    expect(snapProgress(0.4, 4, -1)).toBeNull(); // chapter 2, local .6
    expect(snapProgress(0.675, 4, 1)).toBeNull(); // chapter 3, local .7
  });
  it('between two chapters, moving down → on to the next one, just fully in (local .22)', () => {
    expect(snapProgress(0.48, 4, 1)).toBeCloseTo(0.555, 6);
    expect(snapProgress(0.44, 4, 1)).toBeCloseTo(0.555, 6);
  });
  it('between two chapters, moving up → back to the previous one, still fully in (local .7)', () => {
    expect(snapProgress(0.48, 4, -1)).toBeCloseTo(0.425, 6);
    expect(snapProgress(0.54, 4, -1)).toBeCloseTo(0.425, 6);
  });
  it('no direction → the nearer of the two', () => {
    expect(snapProgress(0.44, 4, 0)).toBeCloseTo(0.425, 6);
    expect(snapProgress(0.54, 4, 0)).toBeCloseTo(0.555, 6);
  });
  it('never against the movement, never farther than half a chapter', () => {
    for (let p = 0; p <= 1; p += 0.003)
      for (const dir of [1, -1] as const) {
        const to = snapProgress(p, 4, dir);
        if (to === null) continue;
        expect((to - p) * dir).toBeGreaterThan(0);
        expect(Math.abs(to - p)).toBeLessThanOrEqual(0.5 / 4);
      }
  });
  it('the entry (first chapter opening) and the exit of the scene are left alone', () => {
    expect(snapProgress(0.02, 4, -1)).toBeNull();
    expect(snapProgress(0.06, 4, 1)).toBeNull();
    expect(snapProgress(0.99, 4, 1)).toBeNull();
    expect(snapProgress(1, 4, -1)).toBeNull();
  });
  it('one chapter → nothing to glide to', () => {
    expect(snapProgress(0.5, 1, 1)).toBeNull();
  });
});

describe('easeGlide — soft start and soft landing', () => {
  it('0 → 0, 1 → 1, monotonic, slow at both ends', () => {
    expect(easeGlide(0)).toBe(0);
    expect(easeGlide(1)).toBe(1);
    expect(easeGlide(0.1)).toBeLessThan(0.1);
    expect(easeGlide(0.9)).toBeGreaterThan(0.9);
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(easeGlide(t)).toBeGreaterThanOrEqual(prev);
      prev = easeGlide(t);
    }
  });
});

describe('snapDuration — 350..800 ms in proportion to the distance', () => {
  it('short glides 350 ms, half a screen and more 800 ms, in between grows with the distance', () => {
    expect(snapDuration(5, 844)).toBe(350);
    expect(snapDuration(844, 844)).toBe(800);
    const a = snapDuration(100, 844);
    const b = snapDuration(300, 844);
    expect(a).toBeGreaterThan(350);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(800);
  });
});
