import { IS_DEMO, assetUrl } from '@/config/demo';
import { API_BASE_URL, emptyApi } from '@/store/empty-api';

/** Языковой аргумент: явно передаём `lang`, чтобы кэш RTK Query различал языки. */
type L = { lang: string };

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NewsItem {
  id: string;
  slug: string;
  title: string;
  lead: string | null;
  body?: string;
  cover: string | null;
  kind: 'news' | 'announcement';
  publishedAt: string | null;
  fallback: boolean;
  /** Все картинки поста (только в GET /news/:slug); обложка — первая. */
  images?: NewsImage[];
  /** Ссылка на исходный пост (импорт из Telegram) или null. */
  sourceUrl?: string | null;
}

export interface NewsImage {
  url: string;
  width?: number;
  height?: number;
  /** Пост Telegram, из которого картинка (у приклеенных постов только с фото — свой). */
  postUrl?: string | null;
}

export interface PriceTier {
  /** 'YYYY-MM-DD' — цена действует до этой даты включительно; null — без срока. */
  until: string | null;
  priceRub: number;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  place: string | null;
  cover: string | null;
  startsAt: string;
  endsAt: string | null;
  isPaid: boolean;
  priceTiers: PriceTier[];
  priceNow: number | null;
  /** Индекс действующей ступени лестницы (по Калининграду); null — вход свободный. */
  priceTierIndex: number | null;
  capacity: number | null;
  fallback: boolean;
}

export interface Fundraiser {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  cover: string | null;
  goalRub: number;
  raisedRub: number;
  supporters: number;
  status: 'active' | 'closed';
  endsAt: string | null;
  fallback: boolean;
}

export interface Program {
  id: string;
  title: string;
  audience: string | null;
  schedule: string | null;
  contact: string | null;
  cover: string | null;
  fallback: boolean;
}

export interface Department {
  id: string;
  title: string;
  description: string | null;
  address: string | null;
  phones: string[];
  email: string | null;
  hours: string | null;
  cover: string | null;
  fallback: boolean;
}

export interface Photo {
  id: string;
  file: string;
  caption: string | null;
  credit: string | null;
  fallback: boolean;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  cover: string | null;
  photosCount: number;
  fallback: boolean;
}

export interface AlbumWithPhotos extends Album {
  photos: Photo[];
}

export interface SearchHit {
  type: 'news' | 'event' | 'program' | 'department' | 'fundraiser';
  id: string;
  slug: string | null;
  title: string;
  snippet: string | null;
  url: string;
  fallback: boolean;
}

export interface PublicSettings {
  supportersCount: number;
  kaddishMonthRub: number | null;
  requisites: string | null;
  operator: string | null;
  socials: { name: string; url: string }[];
  headerPhones: string[];
  fallback: boolean;
}

const MEDIA_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

/** `/media/x.webp` → абсолютный URL на бэкенде; внешние и пустые — как есть. */
export const mediaUrl = (path: string | null | undefined): string | undefined =>
  !path
    ? undefined
    : /^https?:\/\//.test(path)
      ? path
      : IS_DEMO // демо (Pages): файлы снимка лежат статикой под базовым путём
        ? assetUrl(path)
        : `${MEDIA_ORIGIN}${path}`;

export const contentApi = emptyApi.injectEndpoints({
  endpoints: (b) => ({
    getNews: b.query<Paged<NewsItem>, L & { page?: number; limit?: number; kind?: string }>({
      query: ({ lang, ...params }) => ({ url: '/news', params: { ...params, lang } }),
      providesTags: ['News'],
    }),
    getNewsItem: b.query<NewsItem, L & { slug: string }>({
      query: ({ lang, slug }) => ({ url: `/news/${encodeURIComponent(slug)}`, params: { lang } }),
      providesTags: ['News'],
    }),
    getEvents: b.query<Paged<EventItem>, L & { page?: number; limit?: number; past?: boolean }>({
      query: ({ lang, past, ...params }) => ({
        url: '/events',
        params: { ...params, ...(past ? { past: 1 } : {}), lang },
      }),
      providesTags: ['Event'],
    }),
    getEvent: b.query<EventItem, L & { slug: string }>({
      query: ({ lang, slug }) => ({ url: `/events/${encodeURIComponent(slug)}`, params: { lang } }),
      providesTags: ['Event'],
    }),
    getFundraisers: b.query<Fundraiser[], L>({
      query: ({ lang }) => ({ url: '/fundraisers', params: { lang } }),
      providesTags: ['Fundraiser'],
    }),
    getFundraiser: b.query<Fundraiser, L & { slug: string }>({
      query: ({ lang, slug }) => ({
        url: `/fundraisers/${encodeURIComponent(slug)}`,
        params: { lang },
      }),
      providesTags: ['Fundraiser'],
    }),
    getPrograms: b.query<Program[], L>({
      query: ({ lang }) => ({ url: '/programs', params: { lang } }),
      providesTags: ['Program'],
    }),
    getDepartments: b.query<Department[], L>({
      query: ({ lang }) => ({ url: '/departments', params: { lang } }),
      providesTags: ['Department'],
    }),
    getAlbums: b.query<Album[], L>({
      query: ({ lang }) => ({ url: '/albums', params: { lang } }),
      providesTags: ['Album'],
    }),
    getAlbum: b.query<AlbumWithPhotos, L & { slug: string }>({
      query: ({ lang, slug }) => ({ url: `/albums/${encodeURIComponent(slug)}`, params: { lang } }),
      providesTags: ['Album'],
    }),
    search: b.query<{ q: string; items: SearchHit[] }, L & { q: string }>({
      query: ({ lang, q }) => ({ url: '/search', params: { q, lang } }),
    }),
    getPublicSettings: b.query<PublicSettings, L>({
      query: ({ lang }) => ({ url: '/settings/public', params: { lang } }),
      providesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetNewsQuery,
  useGetNewsItemQuery,
  useGetEventsQuery,
  useGetEventQuery,
  useGetFundraisersQuery,
  useGetFundraiserQuery,
  useGetProgramsQuery,
  useGetDepartmentsQuery,
  useGetAlbumsQuery,
  useGetAlbumQuery,
  useSearchQuery,
  useGetPublicSettingsQuery,
} = contentApi;
