import { coverRect, frameIndex, improvesFrame, nearestLoaded, parseManifest } from './scrub-model';

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
