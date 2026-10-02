import {
  approach,
  chapterStops,
  easeKit,
  sceneSnapPoints,
  snapDuration,
  snapTarget,
} from './touch-scroll';

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

describe('chapterStops — where the scene rests for each chapter (pin progress)', () => {
  it('first chapter at the start, last at the end, middle ones once fully in (local .45)', () => {
    expect(chapterStops(4)).toEqual([0, 0.3625, 0.6125, 1]);
    expect(chapterStops(1)).toEqual([0, 1]);
  });
});

describe('sceneSnapPoints — absolute scrollY of the stops + the exit', () => {
  it('runway of 4 chapters on an 844px phone', () => {
    // top 1000, height (4+1)*844 = 4220 → runway 3376; exit = scene bottom at the viewport top
    const pts = sceneSnapPoints(1000, 4220, 844, 4);
    expect(pts.map(Math.round)).toEqual([1000, 2224, 3068, 4376, 5220]);
  });
});

describe('snapTarget — where a stopped scroll is pulled', () => {
  const pts = [1000, 2223.8, 3067.8, 4376, 5220];
  it('no direction → the nearest stop', () => {
    expect(snapTarget(2600, pts, 0)).toBe(2223.8);
    expect(snapTarget(2700, pts, 0)).toBe(3067.8);
  });
  it('the last movement direction wins from 35% of the gap', () => {
    expect(snapTarget(2600, pts, 1)).toBe(3067.8); // 44% of the way down
    expect(snapTarget(2400, pts, 1)).toBe(2223.8); // 21% — back
    expect(snapTarget(2700, pts, -1)).toBe(2223.8); // 56% of the way, moving up
  });
  it('outside the scene or already on a stop → nothing', () => {
    expect(snapTarget(500, pts, 1)).toBeNull();
    expect(snapTarget(6000, pts, -1)).toBeNull();
    expect(snapTarget(2224.5, pts, 1)).toBeNull();
    expect(snapTarget(5219, pts, 1)).toBeNull();
  });
});

describe('easeKit — the kit easing cubic-bezier(.22, 1, .36, 1)', () => {
  it('0 → 0, 1 → 1, fast start, monotonic', () => {
    expect(easeKit(0)).toBe(0);
    expect(easeKit(1)).toBe(1);
    expect(easeKit(0.5)).toBeGreaterThan(0.85);
    let prev = 0;
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(easeKit(t)).toBeGreaterThanOrEqual(prev);
      prev = easeKit(t);
    }
  });
});

describe('snapDuration — 500..800 ms by distance', () => {
  it('short pulls take 500 ms, a full screen and more 800 ms', () => {
    expect(snapDuration(20, 844)).toBe(500);
    expect(snapDuration(844 * 2, 844)).toBe(800);
    const mid = snapDuration(844 / 2, 844);
    expect(mid).toBeGreaterThan(500);
    expect(mid).toBeLessThan(800);
  });
});
