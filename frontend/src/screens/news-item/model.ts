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

/** Заголовок без голых URL (посты Telegram: «Открытие сезона (https://t.me/x)»). */
export const cleanTitle = (title: string): string =>
  title
    .replace(/\(\s*https?:\/\/[^\s)]+\s*\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/** Минуты чтения: ~180 слов в минуту, не меньше одной. */
export const readingMinutes = (text: string): number =>
  Math.max(1, Math.ceil((text.match(/[\p{L}\p{N}]+/gu) ?? []).length / 180));

/**
 * Кадры поста для лайтбокса и галерея под текстом. Обложка — кадр 0 (у импорта она же первая картинка;
 * обложку из сидов, которой нет среди картинок, добавляем). Галерея — остальные кадры с их номером
 * в лайтбоксе; при одном кадре галереи нет — открывает обложка.
 */
export const postGallery = (
  images: NewsImage[] | undefined,
  cover: string | null | undefined
): { photos: Photo[]; gallery: { photo: Photo; index: number }[] } => {
  const list = images ?? [];
  const all = cover && !list.some((im) => im.url === cover) ? [{ url: cover }, ...list] : list;
  const photos = newsPhotos(all);
  const from = cover ? 1 : 0;
  const gallery =
    photos.length > 1 ? photos.slice(from).map((photo, i) => ({ photo, index: i + from })) : [];
  return { photos, gallery };
};

/** Ссылки «Поделиться» для браузеров без Web Share API. */
export const shareLinks = (url: string, title: string) => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    vk: `https://vk.com/share.php?url=${u}&title=${t}`,
  };
};

/** «Все новости»: та же страница «Загрузить ещё» ленты (pages) и карточка, с которой пришли (from). */
export const backToList = (pages: number | null, slug: string): string =>
  `/news?${pages && pages > 1 ? `pages=${pages}&` : ''}from=${encodeURIComponent(slug)}`;

/** «Ещё новости»: до трёх свежих, кроме текущей и соседей из навигации. */
export const moreNews = <T extends { slug: string }>(
  items: T[],
  slug: string,
  exclude: string[]
): T[] => items.filter((n) => n.slug !== slug && !exclude.includes(n.slug)).slice(0, 3);

/**
 * Рамка обложки: широкий кадр — в своих пропорциях (4:3…2:1) и заполняет рамку; вертикальный
 * или квадратный — рамка 3:2, кадр целиком (contain) поверх размытой копии.
 */
export const coverFrame = (
  width: number | undefined,
  height: number | undefined
): { ratio: number; fit: 'cover' | 'contain' } => {
  if (!width || !height) return { ratio: 1.5, fit: 'cover' };
  const r = width / height;
  if (r < 1.2) return { ratio: 1.5, fit: 'contain' };
  return { ratio: Math.min(2, Math.max(4 / 3, r)), fit: 'cover' };
};

/** Страница новости: пост, кадры, соседи, «Ещё новости», шаринг. */
export interface NewsItemViewProps {
  item: NewsItem | undefined;
  notFound: boolean;
  error: ApiError | null;
  onRetry: () => void;
  /** Открытый в лайтбоксе кадр поста или null. */
  open: number | null;
  onOpen: (i: number | null) => void;
  onStep: (delta: number) => void;
  /** Свежие новости для блока «Ещё новости» (уже без текущей и соседей). */
  more: NewsItem[];
  /** «Все новости» — на ту же страницу ленты. */
  backHref: string;
  /** Есть системное меню «Поделиться» (Web Share API). */
  canShare: boolean;
  shareUrl: string;
  onShare: () => void;
  onCopy: () => void;
  /** Текст всплывающего сообщения (ссылка скопирована) или null. */
  toast: string | null;
}
