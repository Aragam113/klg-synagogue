import type { EventItem } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Одна лента афиши (будущие или прошедшие события), по 12, «Загрузить ещё». */
export interface EventFeed {
  items: EventItem[];
  loading: boolean;
  fetching: boolean;
  hasMore: boolean;
  onMore: () => void;
  error: ApiError | null;
  onRetry: () => void;
}

/** Афиша: ближайшие события + прошедшие. */
export interface EventsViewProps {
  upcoming: EventFeed;
  past: EventFeed;
}
