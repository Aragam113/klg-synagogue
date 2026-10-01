import type { SearchHit } from '@/store/api/content';

import { searchView } from './model';

const hit = (title: string): SearchHit => ({
  type: 'program',
  id: title,
  slug: null,
  title,
  snippet: null,
  url: '/programs',
  fallback: false,
});

describe('searchView', () => {
  it('запрос короче двух символов — подсказка, в API не идём', () => {
    expect(searchView('ш', undefined, 'ru')).toMatchObject({ state: 'short', ask: false });
  });
  it('разделы сайта находятся сразу, хиты API — после ответа', () => {
    const v = searchView('галер', undefined, 'ru');
    expect(v).toMatchObject({ state: 'loading', ask: true });
    expect(v.pages).toEqual([{ path: '/gallery', title: 'Галерея' }]);
  });
  it('ни разделов, ни хитов — «ничего не нашлось»; хиты без разделов — результаты', () => {
    expect(searchView('zzzz', { q: 'zzzz', items: [] }, 'en').state).toBe('empty');
    const v = searchView('Shabbat', { q: 'Shabbat', items: [hit('Kabbalat Shabbat')] }, 'en');
    expect(v.state).toBe('results');
    expect(v.total).toBe(2);
  });
});
