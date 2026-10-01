import type { FetchArgs } from '@reduxjs/toolkit/query/react';
import i18next from 'i18next';

/** Normalised API error. `fields` holds machine keys (`required`, `email`, `date_closed`...) - translate via i18n `common:fieldErrors.<key>`. */
export interface ApiError {
  /** 'demo' — the GitHub Pages demo build refused the request (nothing is sent there). */
  status: number | 'network' | 'demo';
  message: string;
  fields?: Record<string, string>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const tr = (key: string) => i18next.t(key, { ns: 'common' });

/** `{success:true,data,message}` -> data; anything else as is. */
export const unwrapData = (body: unknown): unknown =>
  isRecord(body) && body.success === true && 'data' in body ? body.data : body;

const messageOf = (body: Record<string, unknown>): string => {
  const { message } = body;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.filter((m) => typeof m === 'string' && m).join('. ');
  return '';
};

/** Any fetchBaseQuery error -> ApiError. Backend error body: `{success:false,statusCode,message,error,fields?}`. */
export const toApiError = (error: unknown): ApiError => {
  if (!isRecord(error)) return { status: 0, message: tr('errors.client') };
  const { status } = error;
  if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
    return { status: 'network', message: tr('errors.network') };
  }
  const code =
    typeof status === 'number'
      ? status
      : typeof error.originalStatus === 'number'
        ? error.originalStatus
        : 0;
  const body = error.data;
  const text = isRecord(body) ? messageOf(body) : '';
  if (isRecord(body) && text) {
    const result: ApiError = { status: code, message: text };
    if (isRecord(body.fields)) {
      result.fields = Object.fromEntries(
        Object.entries(body.fields).filter((e): e is [string, string] => typeof e[1] === 'string')
      );
    }
    return result;
  }
  if (!code) return { status: 0, message: tr('errors.client') };
  if (code === 429) return { status: code, message: tr('errors.tooMany') };
  return { status: code, message: code >= 500 ? tr('errors.server') : tr('errors.request') };
};

export const isApiError = (v: unknown): v is ApiError =>
  isRecord(v) &&
  typeof v.message === 'string' &&
  (typeof v.status === 'number' || v.status === 'network' || v.status === 'demo');

/** For screens: RTK Query hook error -> ApiError | undefined. */
export const asApiError = (error: unknown): ApiError | undefined =>
  error === undefined || error === null ? undefined : isApiError(error) ? error : toApiError(error);

/** Adds `lang` query param to every request (explicit `params.lang` wins). */
export const withLang = (args: string | FetchArgs, lang: string): FetchArgs => {
  if (typeof args === 'string') {
    const [url, qs] = args.split('?');
    const params: Record<string, string> = {};
    new URLSearchParams(qs ?? '').forEach((v, k) => (params[k] = v));
    return { url, params: { lang, ...params } };
  }
  return { ...args, params: { lang, ...(args.params ?? {}) } };
};

/** Admin endpoints (`/admin/...`) get the Bearer token. */
export const isAdminUrl = (args: string | FetchArgs): boolean =>
  /^\/?admin(\/|$|\?)/.test(typeof args === 'string' ? args : args.url);
