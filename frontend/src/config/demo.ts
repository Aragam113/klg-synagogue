/**
 * GitHub Pages demo build: `EXPO_PUBLIC_DEMO=1 npx expo export -p web`.
 * The API is answered from the static snapshot `public/demo-data/` (see `src/store/demo/`), forms send nothing,
 * the site lives under `experiments.baseUrl` (`/klg-synagogue`, set by app.config.js only for this build).
 * Ordinary dev/prod builds: IS_DEMO=false, BASE_PATH=''.
 */
export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

/** `experiments.baseUrl` without the trailing slash; Expo inlines EXPO_BASE_URL into the bundle. */
export const BASE_PATH = (process.env.EXPO_BASE_URL ?? '').replace(/\/+$/, '');

/** Root-relative static path (`/media/…`, `/demo-data/…`) → path under the site's base URL; others as is. */
export const assetUrl = (path: string): string =>
  path.startsWith('/') && !path.startsWith('//') ? `${BASE_PATH}${path}` : path;
