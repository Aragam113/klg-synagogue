import type { NewsImage, NewsItem, Photo } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

/** Строка без эмодзи/знаков по краям, без регистра и лишних пробелов — для сравнения с заголовком. */
const core = (s: string): string =>
  s
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

/** Тело без первой строки, если она повторяет заголовок (посты Telegram начинаются с заголовка). */
export const bodyWithoutTitle = (body: string, title: string): string => {
  const m = /^\s*([^\n]*)\n?/.exec(body);
  if (!m || !core(title) || core(m[1]) !== core(title)) return body;
  return body.slice(m[0].length).replace(/^\s*\n/, '');
};

/** Имя канала из ссылки на пост t.me/<канал>/<id>; иначе null. */
export const sourceChannel = (url: string | null | undefined): string | null => {
  const m = url ? /^https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\//.exec(url) : null;
  return m ? m[1] : null;
};

/** Посты, из которых приклеены фото (кроме основного), по порядку и без повторов. */
export const extraSources = (
  images: NewsImage[] | undefined,
  main: string | null | undefined
): string[] => [
  ...new Set((images ?? []).map((im) => im.postUrl).filter((u): u is string => !!u && u !== main)),
];

/** Только буквы и цифры, без регистра — для сравнения лида с началом тела. */
const letters = (s: string): string => s.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();

/** Лид повторяет начало тела (лид из импорта — первые предложения поста, возможно обрезанные «…»). */
export const leadRepeatsBody = (lead: string | null | undefined, body: string): boolean => {
  const l = letters(lead ?? '');
  return l.length > 0 && letters(body).startsWith(l);
};

/** Картинки поста → кадры лайтбокса альбома. */
export const newsPhotos = (images: NewsImage[] | undefined): Photo[] =>
  (images ?? []).map((im) => ({
    id: im.url,
    file: im.url,
    caption: null,
    // ссылка на пост-источник кадра — лайтбокс показывает её подписью
    credit: im.postUrl ?? null,
    fallback: false,
  }));

/** Карточка новости: обложка, дата, текст; перевод с фолбэком на ru. */
export interface NewsItemViewProps {
  item: NewsItem | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  /** Открытый в лайтбоксе кадр галереи поста или null. */
  open: number | null;
  onOpen: (i: number | null) => void;
  onStep: (delta: number) => void;
}
