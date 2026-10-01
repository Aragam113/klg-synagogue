import { useTranslation } from 'react-i18next';

import { DEFAULT_LANG, dirOf, isLang, type Lang } from './lang';

import { setLang } from './index';

/**
 * Current language + translator. `useLang()` -> common namespace; `useLang('schedule')` -> your namespace
 * (keys of other namespaces: t('common:nav.news')).
 */
export const useLang = (ns: string | string[] = 'common') => {
  const { t, i18n } = useTranslation(ns);
  const lang: Lang = isLang(i18n.language) ? i18n.language : DEFAULT_LANG;
  return { lang, dir: dirOf(lang), setLang, t };
};
