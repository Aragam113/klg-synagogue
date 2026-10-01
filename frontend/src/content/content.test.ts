import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getContent, PHOTOS } from '@/content';
import { matchStaticPages } from '@/screens/search/static-pages';

/** Форма значения: ключи объектов, длины массивов; пустая строка — дефект перевода. */
const shape = (v: unknown, path = ''): string[] => {
  if (Array.isArray(v))
    return [`${path}[${v.length}]`, ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (v && typeof v === 'object')
    return Object.entries(v).flatMap(([k, x]) => shape(x, `${path}.${k}`));
  if (typeof v === 'string' && v.trim() === '') return [`${path}=EMPTY`];
  return [path];
};

describe('section texts on three languages', () => {
  it.each(['en', 'he'])('%s has the same structure as ru and no empty strings', (lang) => {
    const ru = shape(getContent('ru'));
    expect(ru.filter((p) => p.endsWith('=EMPTY'))).toEqual([]);
    expect(shape(getContent(lang))).toEqual(ru);
  });

  it('falls back to ru for an unknown language', () => {
    expect(getContent('de')).toBe(getContent('ru'));
  });

  it('marks Hebrew as a machine translation', () => {
    const readme = join(__dirname, 'he', 'README.md');
    expect(existsSync(readme) && readFileSync(readme, 'utf8')).toMatch(/машинный перевод/i);
  });

  it('uses only free-licensed photos that exist in public/media with an author and a Commons page', () => {
    const used = getContent('ru').history.chapters.flatMap((c) => c.photos);
    expect(used.length).toBeGreaterThan(5);
    for (const key of used) {
      const p = PHOTOS[key];
      expect(p).toBeDefined();
      expect(p.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(p.license).toMatch(/^(CC BY|CC0|Public domain)/);
      expect(existsSync(join(__dirname, '..', '..', 'public', p.src))).toBe(true);
    }
  });
});

describe('site search finds the section pages', () => {
  it.each([
    ['экскурс', 'ru', '/visit/excursions'],
    ['как добраться', 'ru', '/visit/how-to-get'],
    ['history', 'en', '/history'],
    ['museum', 'en', '/visit/museum'],
    ['היסטוריה', 'he', '/history'],
    ['конфиденциальн', 'ru', '/privacy'],
  ])('%s (%s) → %s', (q, lang, path) => {
    expect(matchStaticPages(q, lang).map((p) => p.path)).toContain(path);
  });
});
