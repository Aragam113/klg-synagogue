import {
  blendFrames,
  bufferedTime,
  videoTime,
  coarsePass,
  coverRect,
  frameIndex,
  improvesFrame,
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

describe('blendFrames — crossfade only between real neighbours, never far frames', () => {
  const all = [true, true, true, true, true];
  it('i and i+1 loaded → crossfade with alpha = the fraction', () => {
    expect(blendFrames(2.25, all)).toEqual({ a: 2, b: 3, alpha: 0.25 });
  });
  it('a whole position → one frame, no blend', () => {
    expect(blendFrames(3, all)).toEqual({ a: 3, b: 3, alpha: 0 });
  });
  it('coarse pass (every 4th) → the nearest loaded frame alone, no double image', () => {
    const coarse = [true, false, false, false, true];
    expect(blendFrames(1.25, coarse)).toEqual({ a: 0, b: 0, alpha: 0 });
    expect(blendFrames(2.75, coarse)).toEqual({ a: 4, b: 4, alpha: 0 });
  });
  it('the neighbour is missing → the loaded frame alone', () => {
    expect(blendFrames(2.25, [true, false, true, false, true])).toEqual({ a: 2, b: 2, alpha: 0 });
  });
  it('nothing loaded → null', () => {
    expect(blendFrames(1, [false, false])).toBeNull();
  });
});

describe('parseManifest — scrub video for phones', () => {
  it('resolves video.src against the folder, keeps frames and fps', () => {
    const m = parseManifest(
      {
        frames: ['a.webp'],
        width: 4,
        height: 3,
        video: { src: 'v/scene.mp4', frames: 260, fps: 10 },
      },
      '/media/scrub/'
    );
    expect(m?.video).toEqual({ src: '/media/scrub/v/scene.mp4', frames: 260, fps: 10 });
  });
  it('broken or missing video → undefined (the frames are used)', () => {
    const base = { frames: ['a.webp'], width: 4, height: 3 };
    expect(parseManifest(base, '/m/')?.video).toBeUndefined();
    expect(
      parseManifest({ ...base, video: { src: 'x.mp4', frames: 0, fps: 10 } }, '/m/')?.video
    ).toBeUndefined();
  });
});

describe('videoTime — the middle of the frame for scroll progress (frame-accurate seek)', () => {
  it('p=0 → first frame, p=1 → last, half → round(p·(N−1))', () => {
    expect(videoTime(0, 260, 10)).toBeCloseTo(0.05, 6);
    expect(videoTime(1, 260, 10)).toBeCloseTo(25.95, 6);
    expect(videoTime(0.5, 260, 10)).toBeCloseTo(13.05, 6);
    expect(videoTime(2, 260, 10)).toBeCloseTo(25.95, 6);
  });
});

describe('coarsePass — the first frames to load on a phone', () => {
  it('every 4th frame plus the last one', () => {
    expect(coarsePass(10, 4)).toEqual([0, 4, 8, 9]);
    expect(coarsePass(9, 4)).toEqual([0, 4, 8]);
  });
});

describe('bufferedTime — while the video loads, seek only into what is already downloaded', () => {
  const ranges: [number, number][] = [
    [0, 4],
    [10, 12],
  ];
  it('inside a downloaded range → the time itself', () => {
    expect(bufferedTime(3, ranges, 0.1)).toBe(3);
    expect(bufferedTime(11, ranges, 0.1)).toBe(11);
  });
  it('outside → the nearest downloaded frame (half a frame — the 3rd argument — inside a range end)', () => {
    expect(bufferedTime(6, ranges, 0.1)).toBeCloseTo(3.9, 6);
    expect(bufferedTime(9, ranges, 0.1)).toBe(10);
    expect(bufferedTime(20, ranges, 0.1)).toBeCloseTo(11.9, 6);
  });
  it('nothing downloaded yet → the time itself', () => {
    expect(bufferedTime(7, [], 0.1)).toBe(7);
  });
});
