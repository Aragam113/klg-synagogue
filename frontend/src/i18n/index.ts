import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  buildResources,
  dirOf,
  isLang,
  type Lang,
  LANG_STORAGE_KEY,
  LANGS,
  resolveInitialLang,
} from './lang';

/**
 * i18next with ru/en/he. Namespaces are files src/i18n/locales/<lang>/<ns>.json, picked up automatically
 * (Metro require.context) - a task adds its namespace by dropping files, no edits here. Default ns: 'common'.
 */
type Ctx = { keys(): string[]; (key: string): unknown };
const ctx = (
  require as unknown as { context: (dir: string, deep: boolean, re: RegExp) => Ctx }
).context('./locales', true, /\.json$/);
const resources = buildResources(ctx.keys().map((k) => [k, ctx(k)]));
const namespaces = Array.from(
  new Set(Object.values(resources).flatMap((r) => Object.keys(r ?? {})))
);

const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

const readStoredSync = (): string | null => {
  try {
    return isWeb ? window.localStorage.getItem(LANG_STORAGE_KEY) : null;
  } catch {
    return null;
  }
};
const query = isWeb ? new URLSearchParams(window.location.search).get('lang') : null;
const initial = resolveInitialLang({ query, stored: readStoredSync() });

const applyHtml = (lang: string) => {
  if (!isWeb || !isLang(lang)) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dirOf(lang);
};

i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: 'ru',
  supportedLngs: [...LANGS],
  ns: namespaces,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  initAsync: false,
});
applyHtml(initial);
i18n.on('languageChanged', applyHtml);

if (isLang(query)) AsyncStorage.setItem(LANG_STORAGE_KEY, query).catch(() => undefined);
if (!isWeb) {
  AsyncStorage.getItem(LANG_STORAGE_KEY)
    .then((stored) => {
      if (isLang(stored) && stored !== i18n.language) i18n.changeLanguage(stored);
    })
    .catch(() => undefined);
}

/** Switch language: persists the choice and keeps an existing ?lang= in the URL in sync. */
export const setLang = (lang: Lang): void => {
  i18n.changeLanguage(lang);
  AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => undefined);
  if (isWeb) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', lang);
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }
};

export default i18n;
