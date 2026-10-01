import { useLocalSearchParams } from 'expo-router';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetNewsItemQuery } from '@/store/api/content';

import { NewsItemView } from './view';

/** /news/[slug] */
export const NewsItemScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang } = useLang('content');
  const q = useGetNewsItemQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  return (
    <NewsItemView
      item={q.data}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
    />
  );
};
