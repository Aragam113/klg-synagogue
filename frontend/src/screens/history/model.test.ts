/** Раскладка глав /history: фото не висят столбиком сбоку и не растягивают главу. */
import { getContent } from '@/content';

import { chapterLayout, historyModel } from './model';

const ch = (photos: number, quote: boolean) => ({
  photos: Array(photos).fill('x'),
  quote: quote ? {} : undefined,
});

describe('chapterLayout', () => {
  it('по числу фото и наличию цитаты', () => {
    expect(chapterLayout(ch(0, false))).toBe('solo');
    expect(chapterLayout(ch(0, true))).toBe('quote');
    expect(chapterLayout(ch(1, true))).toBe('fill');
    expect(chapterLayout(ch(2, false))).toBe('pair');
    expect(chapterLayout(ch(3, true))).toBe('strip');
  });
});

describe('historyModel', () => {
  it('главы с боковой колонкой чередуют сторону, лента и solo — без флипа', () => {
    const m = historyModel(getContent('ru'), 'Хронология');
    expect(m.chapters.map((c) => `${c.id}:${c.layout}${c.flip ? '/flip' : ''}`)).toEqual([
      'koenigsberg:pair',
      'architecture:pair/flip',
      'kristallnacht:quote',
      'fate:solo',
      'revival:strip',
      'opening:fill/flip',
      'today:pair',
    ]);
    expect(m.toc[m.toc.length - 1]).toEqual({ href: '#timeline', title: 'Хронология' });
  });
});
