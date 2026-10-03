/**
 * GitHub Pages demo build: `EXPO_PUBLIC_DEMO=1 npx expo export -p web`.
 * The API is answered from the static snapshot `public/demo-data/` (see `src/store/demo/`), forms send nothing,
 * the site lives under `experiments.baseUrl` (`/klg-synagogue`, set by app.config.js only for this build).
 * Ordinary dev/prod builds: IS_DEMO=false, BASE_PATH=''.
 */
export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

/** `experiments.baseUrl` without the trailing slash; Expo inlines EXPO_BASE_URL into the bundle. */
export const BASE_PATH = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

const hasBase = (path: string): boolean =>
  BASE_PATH !== '' && (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`));

/**
 * Site path → `href` for a real `<a>`: root-relative paths (`/visit`, `/media/…`) get the base URL
 * (once — an already prefixed path stays as is); external, `tel:`, `#hash` and relative links stay as is.
 * Every `<a href>` of the site goes through this (kit `Link` does it): a bare `/visit` on Pages leads to
 * `https://<user>.github.io/visit`, outside the site.
 */
export const routeHref = (path: string): string =>
  path.startsWith('/') && !path.startsWith('//') && !hasBase(path) ? `${BASE_PATH}${path}` : path;

/** Root-relative static path (`/media/…`, `/demo-data/…`) → path under the site's base URL; others as is. */
export const assetUrl = routeHref;

/** Inverse of `routeHref` for in-app navigation: expo-router paths never carry the base URL. */
export const stripBase = (path: string): string =>
  hasBase(path) ? path.slice(BASE_PATH.length) || '/' : path;
