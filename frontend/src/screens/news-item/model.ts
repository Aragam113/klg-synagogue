import type { NewsItem } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Карточка новости (история 50): обложка, дата, текст; перевод с фолбэком на ru (история 10). */
export interface NewsItemViewProps {
  item: NewsItem | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
}
