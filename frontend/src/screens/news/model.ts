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
