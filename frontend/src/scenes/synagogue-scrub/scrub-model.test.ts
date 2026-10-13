import {
  blendCached,
  cacheBudgetMB,
  cachePlan,
  coverRect,
  frameIndex,
  improvesFrame,
  loadOrder,
  nearestLoaded,
  parseManifest,
} from './scrub-model';

describe('frameIndex — кадр строго по прогрессу прокрутки', () => {
  it('p=0 → первый кадр, p=1 → последний, середина → round(p*(N-1))', () => {
    expect(frameIndex(0, 110)).toBe(0);
    expect(frameIndex(1, 110)).toBe(109);
    expect(frameIndex(0.5, 110)).toBe(55); // round(54.5)
    expect(frameIndex(0.1, 11)).toBe(1);
  });
  it('выход за 0..1 и пустой список не ломают индекс', () => {
    expect(frameIndex(-0.3, 10)).toBe(0);
    expect(frameIndex(1.7, 10)).toBe(9);
    expect(frameIndex(0.5, 0)).toBe(0);
  });
});

describe('nearestLoaded — пока кадр не загружен, показываем ближайший загруженный', () => {
  it('нужный загружен → он сам', () => {
    expect(nearestLoaded(3, [true, false, false, true, false])).toBe(3);
  });
  it('нужный не загружен → ближайший с любой стороны', () => {
    expect(nearestLoaded(4, [true, false, false, false, false, true])).toBe(5);
    expect(nearestLoaded(1, [true, false, false, false, true])).toBe(0);
  });
  it('ничего не загружено → -1', () => {
    expect(nearestLoaded(2, [false, false, false])).toBe(-1);
  });
});

describe('coverRect — кадр заполняет холст без полей (cover)', () => {
  it('16:9 кадр в квадрат → по высоте, обрезка по бокам, центр', () => {
    expect(coverRect(1600, 900, 900, 900)).toEqual({ x: -350, y: 0, w: 1600, h: 900 });
  });
  it('16:9 кадр в высокий 390×844 → масштаб по высоте', () => {
    const r = coverRect(1280, 720, 390, 844);
    expect(r.h).toBeCloseTo(844);
    expect(r.w).toBeCloseTo(1500.44, 1);
    expect(r.x).toBeCloseTo((390 - 1500.44) / 2, 1);
    expect(r.y).toBe(0);
  });
  it('широкий холст → масштаб по ширине, обрезка сверху/снизу', () => {
    expect(coverRect(1600, 900, 3200, 1000)).toEqual({ x: 0, y: -400, w: 3200, h: 1800 });
  });
});

describe('parseManifest — manifest.json сцены', () => {
  const base = '/media/scrub/';
  it('имена кадров → URL от папки манифеста; постер по умолчанию — середина', () => {
    const m = parseManifest(
      {
        frames: ['frame-001.webp', 'frame-002.webp', 'frame-003.webp'],
        width: 1280,
        height: 720,
        credits: 'kldsynagogue.com, 2017',
      },
      base
    );
    expect(m).toEqual({
      frames: [
        '/media/scrub/frame-001.webp',
        '/media/scrub/frame-002.webp',
        '/media/scrub/frame-003.webp',
      ],
      width: 1280,
      height: 720,
      credits: 'kldsynagogue.com, 2017',
      poster: 1,
    });
  });
  it('абсолютные URL не трогаются, poster из манифеста учитывается', () => {
    const m = parseManifest(
      { frames: ['/x/a.webp', 'https://cdn/b.webp'], width: 10, height: 5, credits: '', poster: 0 },
      base
    );
    expect(m?.frames).toEqual(['/x/a.webp', 'https://cdn/b.webp']);
    expect(m?.poster).toBe(0);
  });
  it('мусор и пустой список → null (сцена показывает фолбэк, страница не падает)', () => {
    expect(parseManifest(null, base)).toBeNull();
    expect(parseManifest({ frames: [], width: 1, height: 1 }, base)).toBeNull();
    expect(parseManifest({ frames: 'x' }, base)).toBeNull();
    expect(parseManifest({ frames: ['a.webp'], width: 0, height: 720 }, base)).toBeNull();
  });
});

describe('improvesFrame — перерисовка по загрузке кадра только если он ближе к нужному', () => {
  it('нужный кадр или ближе нарисованного → да; дальше или так же далеко → нет', () => {
    expect(improvesFrame(40, 40, 10)).toBe(true);
    expect(improvesFrame(40, 35, 10)).toBe(true);
    expect(improvesFrame(40, 90, 10)).toBe(false);
    expect(improvesFrame(40, 30, 50)).toBe(false);
    expect(improvesFrame(40, 41, 40)).toBe(false);
  });
  it('ничего ещё не нарисовано (-1) → любой загруженный кадр годится', () => {
    expect(improvesFrame(40, 100, -1)).toBe(true);
  });
});

describe('parseManifest — light set for phones', () => {
  it('resolves `light` (the 640px manifest) against the folder', () => {
    const m = parseManifest(
      { frames: ['a.webp'], width: 1280, height: 720, light: 'm/manifest.json' },
      '/media/scrub/'
    );
    expect(m?.light).toBe('/media/scrub/m/manifest.json');
  });
  it('no `light` → undefined', () => {
    expect(
      parseManifest({ frames: ['a.webp'], width: 1, height: 1 }, '/x/')?.light
    ).toBeUndefined();
  });
});

describe('parseManifest — portrait phone set', () => {
  it('resolves `touch` (t/manifest.json) against the folder; the old `video` key is ignored', () => {
    const m = parseManifest(
      {
        frames: ['a.webp'],
        width: 1280,
        height: 720,
        touch: 't/manifest.json',
        video: { src: 'v/scene.mp4', frames: 650, fps: 25 },
      },
      '/media/scrub/'
    );
    expect(m?.touch).toBe('/media/scrub/t/manifest.json');
    expect(m).not.toHaveProperty('video');
  });
  it('no `touch` → undefined', () => {
    expect(
      parseManifest({ frames: ['a.webp'], width: 1, height: 1 }, '/x/')?.touch
    ).toBeUndefined();
  });
});

describe('cacheBudgetMB — decoded-frame memory a phone may spend on the scene', () => {
  it('navigator.deviceMemory 4 GB and more → 200 MB', () => {
    expect(cacheBudgetMB(4)).toBe(200);
    expect(cacheBudgetMB(8)).toBe(200);
  });
  it('2 GB → 100 MB, 1 GB and less → 50 MB', () => {
    expect(cacheBudgetMB(2)).toBe(100);
    expect(cacheBudgetMB(1)).toBe(50);
    expect(cacheBudgetMB(0.5)).toBe(50);
  });
  it('unknown (Safari, Firefox) → 200 MB (an out-of-memory decode degrades at run time)', () => {
    expect(cacheBudgetMB(undefined)).toBe(200);
    expect(cacheBudgetMB(NaN)).toBe(200);
  });
});

describe('cachePlan — which frames of the set are decoded within the budget', () => {
  // 406×720 RGBA = 1 169 280 bytes ≈ 1.115 MB a frame
  const frame = 406 * 720 * 4;
  it('162 frames fit 200 MB → every frame (≈181 MB)', () => {
    const p = cachePlan(162, frame, 200);
    expect(p.stride).toBe(1);
    expect(p.frames).toHaveLength(162);
    expect(Math.round(p.mb)).toBe(181);
  });
  it('100 MB → every 2nd frame plus the last one', () => {
    const p = cachePlan(162, frame, 100);
    expect(p.stride).toBe(2);
    expect(p.frames.slice(0, 3)).toEqual([0, 2, 4]);
    expect(p.frames[p.frames.length - 1]).toBe(161);
    expect(p.frames).toHaveLength(82);
    expect(p.mb).toBeLessThanOrEqual(100);
  });
  it('50 MB → every 4th', () => {
    const p = cachePlan(162, frame, 50);
    expect(p.stride).toBe(4);
    expect(p.mb).toBeLessThanOrEqual(50);
  });
});

describe('loadOrder — the poster first, then ever finer even passes (the scene is usable at any moment)', () => {
  it('9 frames, poster 4: poster, then every 8th, 4th, 2nd, the rest', () => {
    expect(loadOrder([0, 1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([4, 0, 8, 2, 6, 1, 3, 5, 7]);
  });
  it('a strided plan keeps its own frame numbers and has no repeats', () => {
    const o = loadOrder([0, 2, 4, 6, 8, 10], 6);
    expect(o[0]).toBe(6);
    expect([...o].sort((a, b) => a - b)).toEqual([0, 2, 4, 6, 8, 10]);
  });
});

describe('blendCached — crossfade of neighbouring decoded frames by the fractional position', () => {
  const all = [true, true, true, true, true];
  const plan = [0, 1, 2, 3, 4];
  it('both neighbours decoded → a crossfade with alpha = the fraction', () => {
    expect(blendCached(2.25, plan, all)).toEqual({ a: 2, b: 3, alpha: 0.25 });
  });
  it('a whole position → one frame', () => {
    expect(blendCached(3, plan, all)).toEqual({ a: 3, b: 3, alpha: 0 });
  });
  it('a strided plan (every 2nd) blends its own neighbours 2 frames apart', () => {
    expect(blendCached(3, [0, 2, 4], [true, true, true])).toEqual({ a: 2, b: 4, alpha: 0.5 });
  });
  it('a gap wider than maxGap while loading → the nearest decoded frame alone (no double image)', () => {
    const loaded = [true, false, false, false, true];
    expect(blendCached(1.25, plan, loaded, 2)).toEqual({ a: 0, b: 0, alpha: 0 });
    expect(blendCached(2.75, plan, loaded, 2)).toEqual({ a: 4, b: 4, alpha: 0 });
  });
  it('a gap within maxGap while loading → still a crossfade', () => {
    expect(blendCached(1.5, plan, [true, false, true, false, true], 2)).toEqual({
      a: 0,
      b: 2,
      alpha: 0.75,
    });
  });
  it('nothing decoded → null', () => {
    expect(blendCached(1, [0, 1], [false, false])).toBeNull();
  });
});
