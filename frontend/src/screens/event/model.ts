import type { EventItem } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Карточка события: дата, время, место, описание, обложка, цена на сегодня / лестница. */
export interface EventViewProps {
  event: EventItem | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  /** Плавно прокрутить к якорю `#register`. */
  onRegister: () => void;
}

/** Ссылка кнопки записи: форма живёт на той же странице под якорем `#register`. */
export const registerHref = (slug: string) => `/events/${encodeURIComponent(slug)}#register`;
