/** Supported site languages; ru is the source and the fallback. Mirrors backend `@common/localization` - change both together. */
export const LANGS = ['ru', 'en', 'he'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'ru';
/** AsyncStorage key with the visitor's language choice. */
export const LANG_STORAGE_KEY = 'synagogue.lang';

export const isLang = (v: unknown): v is Lang =>
  typeof v === 'string' && (LANGS as readonly string[]).includes(v);

export type Dir = 'ltr' | 'rtl';
export const dirOf = (lang: Lang): Dir => (lang === 'he' ? 'rtl' : 'ltr');

type Json = Record<string, unknown>;
export type Resources = Partial<Record<Lang, Record<string, Json>>>;

/**
 * Files `./<lang>/<namespace>.json` (keys of require.context) -> i18next resources.
 * Any task adds a namespace by dropping files into src/i18n/locales/<lang>/.
 */
export const buildResources = (files: [string, unknown][]): Resources => {
  const out: Resources = {};
  for (const [path, json] of files) {
    const m = /^\.?\/?([a-z]+)\/([\w.-]+)\.json$/.exec(path);
    if (!m || !isLang(m[1])) continue;
    const lang = m[1];
    (out[lang] ??= {})[m[2]] = json as Json;
  }
  return out;
};

/** ?lang= wins (shareable links), then the stored choice, then ru. */
export const resolveInitialLang = (src: { query?: string | null; stored?: string | null }): Lang =>
  isLang(src.query) ? src.query : isLang(src.stored) ? src.stored : DEFAULT_LANG;
