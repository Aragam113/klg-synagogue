import { loadShare, sceneWorthWaiting } from './progress';

describe('loadShare — overall loading the preloader waits for, weighted by what is heavy', () => {
  it('nothing in → 0, everything in → 1', () => {
    const none = ['fonts', 'api', 'images', 'scene'].map((key) => ({ key, f: 0 }));
    expect(loadShare(none)).toBe(0);
    expect(loadShare(none.map((t) => ({ ...t, f: 1 })))).toBe(1);
  });
  it('the scene frame cache weighs most: fonts + API + images in, scene empty → under half', () => {
    const s = loadShare([
      { key: 'fonts', f: 1 },
      { key: 'api', f: 1 },
      { key: 'images', f: 1 },
      { key: 'scene', f: 0 },
    ]);
    expect(s).toBeGreaterThan(0.3);
    expect(s).toBeLessThan(0.5);
  });
  it('only the scene in → over half', () => {
    expect(
      loadShare([
        { key: 'fonts', f: 0 },
        { key: 'api', f: 0 },
        { key: 'images', f: 0 },
        { key: 'scene', f: 1 },
      ])
    ).toBeGreaterThan(0.5);
  });
  it('an unknown task weighs 1; fractions are clamped', () => {
    expect(
      loadShare([
        { key: 'x', f: 2 },
        { key: 'y', f: -1 },
      ])
    ).toBe(0.5);
  });
});

describe('sceneWorthWaiting — the line waits for the scene cache only while it can make it before the ceiling', () => {
  it('no report yet: waits a moment for the scene to start, then not', () => {
    expect(sceneWorthWaiting({ f: undefined, loadingMs: 0, elapsedMs: 1000 })).toBe(true);
    expect(sceneWorthWaiting({ f: undefined, loadingMs: 0, elapsedMs: 3000 })).toBe(false);
  });
  it('fast enough (half in after 1 s, 2 s into the preloader) → waits', () => {
    expect(sceneWorthWaiting({ f: 0.5, loadingMs: 1000, elapsedMs: 2000 })).toBe(true);
  });
  it('too slow to finish before the ceiling (10% in 2 s) → the site goes on, the scene keeps loading', () => {
    expect(sceneWorthWaiting({ f: 0.1, loadingMs: 2000, elapsedMs: 3000 })).toBe(false);
  });
  it('just started: no rate yet → waits', () => {
    expect(sceneWorthWaiting({ f: 0.02, loadingMs: 300, elapsedMs: 1500 })).toBe(true);
  });
});
