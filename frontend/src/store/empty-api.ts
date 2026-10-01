import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query/react';
import i18next from 'i18next';

import { IS_DEMO } from '@/config/demo';
import { reportAdminResponse } from '@/store/api/admin-auth';
import { getAdminToken } from '@/store/api/admin-token';
import { type ApiError, isAdminUrl, toApiError, unwrapData, withLang } from '@/store/api/http';
import { demoBaseQuery } from '@/store/demo/demo-base-query';

/**
 * Base RTK Query API. Each task adds `src/store/api/<module>.ts`:
 *   export const newsApi = emptyApi.injectEndpoints({ endpoints: (b) => ({ getNews: b.query<News[], void>({ query: () => '/news' }) }) });
 * Hooks receive the unwrapped `data`; errors are ApiError (use asApiError). `?lang=` is added automatically,
 * `/admin/...` urls get `Authorization: Bearer <synagogue.adminToken>`.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const rawBaseQuery = fetchBaseQuery({ baseUrl: API_BASE_URL });

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extra
) => {
  let req = withLang(args, i18next.resolvedLanguage ?? i18next.language ?? 'ru');
  if (IS_DEMO) return demoBaseQuery(req);
  if (isAdminUrl(args)) {
    const token = await getAdminToken();
    if (token)
      req = {
        ...req,
        headers: { ...(req.headers as Record<string, string>), Authorization: `Bearer ${token}` },
      };
  }
  const result = await rawBaseQuery(req, api, extra);
  reportAdminResponse(args, result.meta?.response?.status);
  if (result.error) return { error: toApiError(result.error), meta: result.meta };
  return { data: unwrapData(result.data), meta: result.meta };
};

export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'News',
    'Event',
    'Fundraiser',
    'Program',
    'Department',
    'Album',
    'Settings',
    'Calendar',
    'Request',
    'Payment',
    'Subscriber',
    'Schedule',
  ],
  endpoints: () => ({}),
});
