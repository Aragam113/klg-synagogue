import { IS_DEMO, routeHref } from './demo';

/** Demo hosting is fixed; a live deployment supplies its public origin. */
export const SITE_ORIGIN = (
  process.env.EXPO_PUBLIC_SITE_ORIGIN ?? (IS_DEMO ? 'https://aragam113.github.io' : '')
).replace(/\/+$/, '');
export const publicUrl = (pathname: string): string => {
  if (/^https?:\/\//.test(pathname)) return pathname;
  const local = routeHref(pathname);
  const origin = SITE_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
  return origin ? new URL(local, origin).href : local;
};
