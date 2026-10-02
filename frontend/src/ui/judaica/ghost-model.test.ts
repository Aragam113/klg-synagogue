import { DEFAULT_GHOST_WORDS, ghostLayout, TITLE_ZONE, underTitle } from './ghost-model';

describe('ghostLayout — «Созвездие»', () => {
  it('тот же seed → тот же узор, другой seed → другой', () => {
    const a = ghostLayout({ seed: 'visit' });
    expect(ghostLayout({ seed: 'visit' })).toEqual(a);
    expect(ghostLayout({ seed: 'news' })).not.toEqual(a);
  });

  it('по умолчанию 6 слов на десктопе и 3 на телефоне, якорь — первое слово набора', () => {
    const w = ghostLayout({ seed: 'x' });
    expect(w).toHaveLength(6);
    expect(w.filter((x) => !x.desk)).toHaveLength(3);
    expect(w[0].text).toBe('שלום');
    expect(w[0].desk).toBe(false);
    expect(w.every((x) => DEFAULT_GHOST_WORDS.includes(x.text))).toBe(true);
  });

  it('плотность и свой набор слов', () => {
    const w = ghostLayout({
      seed: 's',
      words: ['תפילה', 'שבת שלום'],
      density: { desk: 4, phone: 2 },
    });
    expect(w.map((x) => x.text)).toEqual(['תפילה', 'שבת שלום', 'שבת שלום', 'שבת שלום']);
    expect(w.filter((x) => !x.desk)).toHaveLength(2);
  });

  it('спутники не ложатся под заголовок (центр и край), прозрачность низкая, якорь крупнее всех', () => {
    for (const titleAt of ['center', 'start', 'end', 'top'] as const) {
      for (let i = 0; i < 200; i++) {
        const [anchor, ...rest] = ghostLayout({
          seed: `p${i}`,
          titleAt,
          density: { desk: 8, phone: 3 },
        });
        expect(rest.length).toBe(7);
        for (const w of rest) {
          expect(underTitle(w, TITLE_ZONE[titleAt])).toBe(false);
          expect(w.size).toBeLessThan(anchor.size);
          expect(w.o).toBeGreaterThanOrEqual(0.03);
          expect(w.o).toBeLessThanOrEqual(0.07);
          expect(w.x).toBeGreaterThanOrEqual(6);
          expect(w.x).toBeLessThanOrEqual(94);
        }
      }
    }
  });

  it('underTitle: точка в зоне центра — да, в углу — нет', () => {
    expect(underTitle({ x: 50, y: 50 }, TITLE_ZONE.center)).toBe(true);
    expect(underTitle({ x: 14, y: 18 }, TITLE_ZONE.center)).toBe(false);
    expect(underTitle({ x: 30, y: 50 }, TITLE_ZONE.start)).toBe(true);
    expect(underTitle({ x: 80, y: 50 }, TITLE_ZONE.start)).toBe(false);
    expect(underTitle({ x: 14, y: 18 }, TITLE_ZONE.top)).toBe(true);
    expect(underTitle({ x: 86, y: 18 }, TITLE_ZONE.top)).toBe(false);
  });

  it('якорь: при заголовке сбоку или сверху уходит на свободную сторону; anchor=center — фоном по центру', () => {
    for (const titleAt of ['start', 'end', 'top'] as const) {
      for (let i = 0; i < 100; i++) {
        const [a] = ghostLayout({ seed: `a${i}`, titleAt });
        expect(underTitle(a, TITLE_ZONE[titleAt])).toBe(false);
      }
    }
    const [c] = ghostLayout({ seed: 'hero', titleAt: 'start', anchor: 'center' });
    expect(Math.abs(c.x - 50)).toBeLessThanOrEqual(5);
    expect(Math.abs(c.y - 50)).toBeLessThanOrEqual(4);
  });
});
