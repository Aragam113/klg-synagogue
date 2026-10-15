import {
  blendCached,
  coverRect,
  frameIndex,
  improvesFrame,
  filmChapterOf,
  filmRate,
  filmStallMs,
  filmTarget,
  keyFrames,
  loadOrder,
  nearestLoaded,
  parseManifest,
  touchFrameCount,
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

describe('keyFrames — телефон: ключевые кадры поровну по всей сцене', () => {
  it('162 кадра, 24 ключа → 0, 7, 14 … 161 (каждый 7-й, первый и последний включены)', () => {
    const k = keyFrames(162, 24);
    expect(k).toHaveLength(24);
    expect(k[0]).toBe(0);
    expect(k[1]).toBe(7);
    expect(k[23]).toBe(161);
    expect(k.every((f, i) => i === 0 || f > k[i - 1])).toBe(true);
  });
  it('ключей больше, чем кадров → все кадры по разу', () => {
    expect(keyFrames(5, 24)).toEqual([0, 1, 2, 3, 4]);
  });
  it('пустой набор → пусто', () => {
    expect(keyFrames(0, 24)).toEqual([]);
  });
});

describe('touchFrameCount — фазы сцены на телефоне (?s=1): плотность по памяти устройства', () => {
  it('≥ 4 ГБ или неизвестно (Safari) → 120 кадров (~79 МБ при 304×540)', () => {
    expect(touchFrameCount(undefined)).toBe(120);
    expect(touchFrameCount(8)).toBe(120);
    expect(touchFrameCount(4)).toBe(120);
  });
  it('2–3 ГБ → 80, меньше → 54', () => {
    expect(touchFrameCount(2)).toBe(80);
    expect(touchFrameCount(1)).toBe(54);
    expect(touchFrameCount(0.5)).toBe(54);
  });
});

describe('parseManifest — chapter film (?s=2)', () => {
  it('resolves the four files against the folder and keeps duration and holds', () => {
    const m = parseManifest(
      {
        frames: ['a.webp'],
        width: 1,
        height: 1,
        film: {
          p: 'v/p.mp4',
          pr: 'v/pr.mp4',
          l: 'v/l.mp4',
          lr: 'v/lr.mp4',
          duration: 26,
          holds: [0, 13, 26],
        },
      },
      '/media/scrub/'
    );
    expect(m?.film).toEqual({
      p: '/media/scrub/v/p.mp4',
      pr: '/media/scrub/v/pr.mp4',
      l: '/media/scrub/v/l.mp4',
      lr: '/media/scrub/v/lr.mp4',
      duration: 26,
      holds: [0, 13, 26],
    });
  });
  it('a film without all four files or holds → no film', () => {
    expect(
      parseManifest(
        { frames: ['a.webp'], width: 1, height: 1, film: { p: 'v/p.mp4', duration: 26 } },
        '/x/'
      )?.film
    ).toBeUndefined();
  });
});

describe('filmTarget — «кино» (?s=2): куда показывает прокрутка, секунды фильма', () => {
  // 26 s, 4 chapters: holds 0 / 8.667 / 17.333 / 26 at the chapter stops 0, 1.22/4, 2.22/4, 3.22/4
  const holds = [0, 26 / 3, 52 / 3, 26];
  it('на остановках глав — их стоянки', () => {
    expect(filmTarget(0, holds)).toBe(0);
    expect(filmTarget(1.22 / 4, holds)).toBeCloseTo(8.667, 3);
    expect(filmTarget(2.22 / 4, holds)).toBeCloseTo(17.333, 3);
    expect(filmTarget(3.22 / 4, holds)).toBeCloseTo(26, 3);
  });
  it('между остановками — линейно, с первых пикселей', () => {
    // 0.18 of 0.305 of the way to the first stop → 8.667 × 0.18 / 0.305 = 5.115
    expect(filmTarget(0.18, holds)).toBeCloseTo(5.115, 2);
    expect(filmTarget(0.001, holds)).toBeGreaterThan(0);
  });
  it('после последней остановки и за краями — конец / начало', () => {
    expect(filmTarget(0.95, holds)).toBe(26);
    expect(filmTarget(-0.2, holds)).toBe(0);
  });
});

describe('filmChapterOf — текст главы по фактической позиции камеры', () => {
  const holds = [0, 26 / 3, 52 / 3, 26];
  it('ближайшая стоянка', () => {
    expect(filmChapterOf(4.3, holds)).toBe(0);
    expect(filmChapterOf(4.4, holds)).toBe(1);
    expect(filmChapterOf(25, holds)).toBe(3);
  });
});

describe('filmRate — скорость камеры: скорость прокрутки + догонка (до ±6×)', () => {
  it('стоит на месте, прокрутка стоит → 0', () => {
    expect(filmRate(0, 0)).toBe(0);
  });
  it('отстаёт на 1 с → догоняет 4× (постоянная времени 0.25 с)', () => {
    expect(filmRate(1, 0)).toBe(4);
  });
  it('прокрутка ведёт 2 с фильма в секунду → 2×', () => {
    expect(filmRate(0, 2)).toBe(2);
  });
  it('назад: отставание −0.5 с при прокрутке −1 с/с → −3×', () => {
    expect(filmRate(-0.5, -1)).toBe(-3);
  });
  it('не быстрее 6×', () => {
    expect(filmRate(5, 3)).toBe(6);
    expect(filmRate(-5, 0)).toBe(-6);
  });
});

describe('filmStallMs — the watchdog: how long a film told to move may go without a new frame', () => {
  it('a film standing or idling at a 16th (no frame due within the window) is never a stall', () => {
    expect(filmStallMs(0)).toBe(Infinity);
    expect(filmStallMs(0.0625)).toBe(Infinity);
  });
  it('at 1× and faster — about 300 ms plus two film frames (1/25 s each) at that rate', () => {
    expect(filmStallMs(1)).toBe(380);
    expect(filmStallMs(-2)).toBe(340);
    expect(filmStallMs(6)).toBeCloseTo(313.3, 1);
  });
  it('slow closing at a quarter waits for its two frames (0.08 s of film = 320 ms)', () => {
    expect(filmStallMs(0.25)).toBe(620);
  });
});
