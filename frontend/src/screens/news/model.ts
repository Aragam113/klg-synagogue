import type { NewsItem } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Лента новостей и анонсов: по 9, «Загрузить ещё». */
export interface NewsViewProps {
  items: NewsItem[];
  /** Первая загрузка — ещё нечего показать. */
  loading: boolean;
  /** Догружается следующая страница. */
  fetching: boolean;
  hasMore: boolean;
  onMore: () => void;
  error: ApiError | null;
  onRetry: () => void;
}

/** sessionStorage: сколько страниц ленты открыто — «Все новости» на странице новости возвращает туда же. */
export const NEWS_PAGES_KEY = 'synagogue.newsPages';

/** Параметр `?pages=` → число страниц для догрузки (1…30). */
export const pagesParam = (v: unknown): number => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) ? Math.min(30, Math.max(1, n)) : 1;
};
