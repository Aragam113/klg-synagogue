import type { AlbumWithPhotos, Photo } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Следующий/предыдущий кадр лайтбокса по кругу. */
export const stepPhoto = (i: number, delta: number, n: number): number =>
  n <= 0 ? 0 : (((i + delta) % n) + n) % n;

/** Клавиша → действие лайтбокса; в RTL стрелки зеркальны (вправо — к предыдущему). */
export const lightboxKey = (key: string, dir: 'ltr' | 'rtl'): 'close' | 1 | -1 | null => {
  if (key === 'Escape') return 'close';
  const sign = dir === 'rtl' ? -1 : 1;
  if (key === 'ArrowRight') return sign === 1 ? 1 : -1;
  if (key === 'ArrowLeft') return sign === 1 ? -1 : 1;
  return null;
};

export interface AlbumViewProps {
  album: AlbumWithPhotos | undefined;
  loading: boolean;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  /** Открытый в лайтбоксе кадр или null. */
  open: number | null;
  onOpen: (i: number | null) => void;
  onStep: (delta: number) => void;
}

/** Уникальные подписи авторства (для списка «Авторы фотографий»). */
export const uniqueCredits = (photos: Photo[]): string[] => [
  ...new Set(photos.map((p) => p.credit).filter((c): c is string => !!c)),
];
