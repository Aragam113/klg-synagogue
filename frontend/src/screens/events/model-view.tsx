import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetEventsQuery } from '@/store/api/content';

import type { EventFeed } from './model';
import { useFeedItems, usePageCursor } from './use-feed';
import { EventsView } from './view';

const useEventFeed = (lang: string, past: boolean): EventFeed => {
  const { page, next } = usePageCursor(lang);
  const q = useGetEventsQuery({ lang, page, past });
  const items = useFeedItems(q.data);
  return {
    items,
    loading: q.isLoading,
    fetching: q.isFetching,
    hasMore: !!q.data?.hasMore,
    onMore: next,
    error: q.error ? (asApiError(q.error) ?? null) : null,
    onRetry: q.refetch,
  };
};

/** /events — будущие опубликованные события по возрастанию + прошедшие. */
export const EventsScreen = () => {
  const { lang } = useLang('content');
  const upcoming = useEventFeed(lang, false);
  const past = useEventFeed(lang, true);
  return <EventsView upcoming={upcoming} past={past} />;
};
