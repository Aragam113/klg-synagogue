/**
 * Заголовки статических страниц для поиска по сайту (`/search`): их ищет фронт,
 * динамический контент — бэкенд (`GET /search`). Статические разделы перечислены
 * в этом массиве (path + заголовок на трёх языках + необязательные ключевые слова).
 */
import pageMetadata from '@/config/page-metadata.json';

export interface StaticPage {
  path: string;
  title: { ru: string; en: string; he: string };
  keywords?: { ru?: string; en?: string; he?: string };
}

export const staticPages: StaticPage[] = pageMetadata;

type Lang = keyof StaticPage['title'];
const asLang = (lang: string): Lang => (lang === 'en' || lang === 'he' ? lang : 'ru');

/** Страницы, в заголовке или ключевых словах которых есть запрос (≥ 2 символов). */
export const matchStaticPages = (q: string, lang: string): { path: string; title: string }[] => {
  const needle = q.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  const l = asLang(lang);
  return staticPages
    .filter((p) => `${p.title[l]} ${p.keywords?.[l] ?? ''}`.toLocaleLowerCase().includes(needle))
    .map((p) => ({ path: p.path, title: p.title[l] }));
};
