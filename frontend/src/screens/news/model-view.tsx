import { useLang } from '@/i18n/use-lang';
import { usePageCursor, useFeedItems } from '@/screens/events/use-feed';
import { asApiError } from '@/store';
import { useGetNewsQuery } from '@/store/api/content';

import { NewsView } from './view';

/** /news — контейнер ленты: страницы API → склеенная лента. */
export const NewsScreen = () => {
  const { lang } = useLang('content');
  const { page, next } = usePageCursor(lang);
  const q = useGetNewsQuery({ lang, page });
  const items = useFeedItems(q.data);
  return (
    <NewsView
      items={items}
      loading={q.isLoading}
      fetching={q.isFetching}
      hasMore={!!q.data?.hasMore}
      onMore={next}
      error={q.error ? (asApiError(q.error) ?? null) : null}
      onRetry={q.refetch}
    />
  );
};
