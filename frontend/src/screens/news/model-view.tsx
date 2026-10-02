import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useLang } from '@/i18n/use-lang';
import { usePageCursor, useFeedItems } from '@/screens/events/use-feed';
import { asApiError } from '@/store';
import { useGetNewsQuery } from '@/store/api/content';

import { NEWS_PAGES_KEY, pagesParam } from './model';
import { NewsView } from './view';

/**
 * /news — контейнер ленты: страницы API → склеенная лента. `?pages=N&from=<slug>` (ссылка «Все новости»
 * со страницы новости) догружает ленту до N-й страницы и прокручивает к карточке, с которой ушли.
 */
export const NewsScreen = () => {
  const { lang } = useLang('content');
  const params = useLocalSearchParams<{ pages?: string; from?: string }>();
  const target = pagesParam(params.pages);
  const from = typeof params.from === 'string' ? params.from : null;
  const { page, next } = usePageCursor(lang);
  const q = useGetNewsQuery({ lang, page });
  const items = useFeedItems(q.data);
  const scrolled = useRef(false);

  useEffect(() => {
    if (q.data && !q.isFetching && q.data.page === page && page < target && q.data.hasMore) next();
  }, [q.data, q.isFetching, page, target, next]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(NEWS_PAGES_KEY, String(page));
    } catch {
      // приватный режим — вернёмся на первую страницу
    }
  }, [page]);

  useEffect(() => {
    if (!from || scrolled.current || !items.some((n) => n.slug === from)) return;
    scrolled.current = true;
    requestAnimationFrame(() =>
      document
        .querySelector(`[data-slug="${CSS.escape(from)}"]`)
        ?.scrollIntoView({ block: 'center' })
    );
  }, [from, items]);

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
