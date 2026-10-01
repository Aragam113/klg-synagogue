import { emptyApi } from '@/store/empty-api';

/**
 * Админка: вход, CRUD контента, настройки, загрузка файлов.
 * Bearer для /admin/* ставит baseQuery; ответ 401 → экран выходит на логин (AdminGate).
 */
export type Row = Record<string, unknown> & { id: string };

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

/** Пути CRUD-контроллеров контента: /admin/<path>. */
export type ContentPath =
  | 'news'
  | 'events'
  | 'fundraisers'
  | 'programs'
  | 'departments'
  | 'albums'
  | 'photos';

/** Публичные теги, которые сбрасываются после правки в админке. */
const PUBLIC_TAG: Record<
  ContentPath,
  'News' | 'Event' | 'Fundraiser' | 'Program' | 'Department' | 'Album'
> = {
  news: 'News',
  events: 'Event',
  fundraisers: 'Fundraiser',
  programs: 'Program',
  departments: 'Department',
  albums: 'Album',
  photos: 'Album',
};

export const adminApi = emptyApi
  .enhanceEndpoints({ addTagTypes: ['AdminContent', 'AdminSettings'] })
  .injectEndpoints({
    endpoints: (b) => ({
      adminLogin: b.mutation<{ token: string }, { email: string; password: string }>({
        query: (body) => ({ url: '/admin/login', method: 'POST', body }),
      }),
      adminList: b.query<
        Paged<Row>,
        { path: ContentPath; page?: number; limit?: number; albumId?: string }
      >({
        query: ({ path, ...params }) => ({
          url: `/admin/${path}`,
          params,
        }),
        providesTags: (_r, _e, a) => [{ type: 'AdminContent', id: a.path }],
      }),
      adminGet: b.query<Row, { path: ContentPath; id: string }>({
        query: ({ path, id }) => ({ url: `/admin/${path}/${id}` }),
        providesTags: (_r, _e, a) => [{ type: 'AdminContent', id: `${a.path}:${a.id}` }],
      }),
      adminCreate: b.mutation<Row, { path: ContentPath; body: Record<string, unknown> }>({
        query: ({ path, body }) => ({
          url: `/admin/${path}`,
          method: 'POST',
          body,
        }),
        invalidatesTags: (_r, _e, a) => [{ type: 'AdminContent', id: a.path }, PUBLIC_TAG[a.path]],
      }),
      adminUpdate: b.mutation<
        Row,
        { path: ContentPath; id: string; body: Record<string, unknown> }
      >({
        query: ({ path, id, body }) => ({
          url: `/admin/${path}/${id}`,
          method: 'PATCH',
          body,
        }),
        invalidatesTags: (_r, _e, a) => [
          { type: 'AdminContent', id: a.path },
          { type: 'AdminContent', id: `${a.path}:${a.id}` },
          PUBLIC_TAG[a.path],
        ],
      }),
      adminDelete: b.mutation<{ id: string }, { path: ContentPath; id: string }>({
        query: ({ path, id }) => ({
          url: `/admin/${path}/${id}`,
          method: 'DELETE',
        }),
        invalidatesTags: (_r, _e, a) => [{ type: 'AdminContent', id: a.path }, PUBLIC_TAG[a.path]],
      }),
      adminSettings: b.query<Record<string, unknown>, void>({
        query: () => ({ url: '/admin/settings' }),
        providesTags: ['AdminSettings'],
      }),
      adminPutSettings: b.mutation<Record<string, unknown>, Record<string, unknown>>({
        query: (body) => ({ url: '/admin/settings', method: 'PUT', body }),
        invalidatesTags: ['AdminSettings', 'Settings'],
      }),
      /** multipart `file` → {url:'/media/<uuid>.webp'} */
      adminUpload: b.mutation<{ url: string }, File | Blob>({
        query: (file) => {
          const body = new FormData();
          body.append('file', file);
          return { url: '/admin/uploads', method: 'POST', body };
        },
      }),
    }),
  });

export const {
  useAdminLoginMutation,
  useAdminListQuery,
  useAdminGetQuery,
  useAdminCreateMutation,
  useAdminUpdateMutation,
  useAdminDeleteMutation,
  useAdminSettingsQuery,
  useAdminPutSettingsMutation,
  useAdminUploadMutation,
} = adminApi;
