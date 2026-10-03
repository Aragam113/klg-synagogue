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

describe('sceneSnapPoints — absolute scrollY of the chapter stops (no exit stop)', () => {
  it('runway of 4 chapters on an 844px phone', () => {
    const pts = sceneSnapPoints(1000, 5 * 844, 844, 4);
    expect(pts.map(Math.round)).toEqual([1000, 2224, 3068, 4376]);
  });
});

describe('snapTarget — where a scroll at rest is pulled (vh 844, chapter gap 844)', () => {
  const pts = [1000, 2223.8, 3067.8, 4376];
  it('moving down: on to the next chapter after ~30% of it, otherwise back to the current one', () => {
    expect(snapTarget(2523.8, pts, 1, 844)).toBe(3067.8); // 300px = 36% down
    expect(snapTarget(2400, pts, 1, 844)).toBe(2223.8); // 176px = 21% — back
  });
  it('moving up: the same mirrored', () => {
    expect(snapTarget(2800, pts, -1, 844)).toBe(2223.8); // 268px up
    expect(snapTarget(2900, pts, -1, 844)).toBe(3067.8); // 168px up — back down
  });
  it('no direction → the nearest stop', () => {
    expect(snapTarget(2600, pts, 0, 844)).toBe(2223.8);
    expect(snapTarget(2700, pts, 0, 844)).toBe(3067.8);
  });
  it('never pulls against the movement farther than 30% of a screen', () => {
    for (let y = 1000; y <= 4376; y += 7)
      for (const dir of [1, -1] as const) {
        const to = snapTarget(y, pts, dir, 844);
        if (to !== null) expect((to - y) * dir).toBeGreaterThanOrEqual(-0.3 * 844);
      }
  });
  it('leaves the entry and the exit of the scene alone', () => {
    expect(snapTarget(900, pts, 1, 844)).toBeNull(); // above the scene
    expect(snapTarget(1100, pts, 1, 844)).toBeNull(); // just entered
    expect(snapTarget(1100, pts, -1, 844)).toBeNull(); // leaving upwards
    expect(snapTarget(4376, pts, 1, 844)).toBeNull(); // the last stop
    expect(snapTarget(4500, pts, -1, 844)).toBeNull(); // past it — leaving the scene
  });
  it('already on a stop → nothing', () => {
    expect(snapTarget(2224.5, pts, 1, 844)).toBeNull();
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

describe('snapDuration — 300..700 ms in proportion to the distance', () => {
  it('short pulls 300 ms, a screen and more 700 ms, in between grows with the distance', () => {
    expect(snapDuration(5, 844)).toBe(300);
    expect(snapDuration(844 * 2, 844)).toBe(700);
    const a = snapDuration(200, 844);
    const b = snapDuration(500, 844);
    expect(a).toBeGreaterThan(300);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(700);
  });
});
