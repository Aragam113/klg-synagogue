import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetEventQuery } from '@/store/api/content';

import { EventView } from './view';

const scrollToRegister = () => {
  if (typeof document === 'undefined') return;
  document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/** /events/[slug] */
export const EventScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang } = useLang('content');
  const q = useGetEventQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const loaded = !!q.data;

  // Пришли по ссылке /events/<slug>#register: докрутить к форме, когда карточка отрисована.
  useEffect(() => {
    if (loaded && typeof window !== 'undefined' && window.location.hash === '#register') {
      setTimeout(scrollToRegister, 120);
    }
  }, [loaded]);

  return (
    <EventView
      event={q.data}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      onRegister={() => {
        if (typeof window !== 'undefined') window.history.replaceState(null, '', '#register');
        scrollToRegister();
      }}
    />
  );
};
