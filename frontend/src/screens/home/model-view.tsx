import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { getContent } from '@/content';
import { useLang } from '@/i18n/use-lang';
import { dedicationItems } from '@/screens/donate/donate-model';
import { useNow } from '@/screens/schedule/model';
import { useGetTodayQuery } from '@/store/api/calendar';
import {
  useGetEventsQuery,
  useGetFundraisersQuery,
  useGetNewsQuery,
  useGetPublicSettingsQuery,
} from '@/store/api/content';
import { useGetDedicationsQuery } from '@/store/api/payments';

import { blockState, lifeVariant, sceneChapters, todayBlock } from './model';
import { HomeView } from './view';

/** Home screen: reads calendar / content / dedications, turns answers into section states, renders HomeView. */
export const HomeScreen = () => {
  const { t, lang } = useLang('home');
  const now = useNow();
  const { life } = useLocalSearchParams<{ life?: string }>();

  const today = useGetTodayQuery(undefined, { pollingInterval: 30 * 60 * 1000 });
  const events = useGetEventsQuery({ lang, page: 1 });
  const funds = useGetFundraisersQuery({ lang });
  const settings = useGetPublicSettingsQuery({ lang });
  const news = useGetNewsQuery({ lang, page: 1, limit: 3 });
  const ded = useGetDedicationsQuery({ limit: 20 });

  const chapters = useMemo(
    () =>
      sceneChapters(getContent(lang).history, t('scene.today'), {
        title: t('scene.todayTitle'),
        italic: t('scene.todayItalic'),
      }),
    [lang, t]
  );
  const dedications = useMemo(
    () => (ded.isError ? [] : dedicationItems(ded.data ?? [], t('payments:donate.anonymous'))),
    [ded.data, ded.isError, t]
  );

  const eventItems = events.data?.items ?? [];
  const fundItems = funds.data ?? [];
  const newsItems = news.data?.items ?? [];

  return (
    <HomeView
      t={t}
      lang={lang}
      life={lifeVariant(life)}
      chapters={chapters}
      today={{
        state: today.isLoading ? 'loading' : today.data ? 'ready' : 'empty',
        block: today.data ? todayBlock(today.data, now, lang) : null,
      }}
      events={{
        state: blockState(
          { isLoading: events.isLoading, isError: events.isError, items: eventItems },
          'empty'
        ),
        items: eventItems,
      }}
      funds={{
        state: blockState(
          { isLoading: funds.isLoading, isError: funds.isError, items: fundItems },
          'empty'
        ),
        items: fundItems,
        supporters: settings.data?.supportersCount ?? null,
      }}
      dedications={dedications}
      news={{
        state: blockState(
          { isLoading: news.isLoading, isError: news.isError, items: newsItems },
          'empty'
        ),
        items: newsItems,
      }}
    />
  );
};
