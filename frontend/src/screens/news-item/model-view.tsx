import { useLocalSearchParams } from 'expo-router';

import { useLang } from '@/i18n/use-lang';
import { useLightbox } from '@/screens/album/use-lightbox';
import { asApiError } from '@/store';
import { useGetNewsItemQuery } from '@/store/api/content';

import { NewsItemView } from './view';

/** /news/[slug] — текст поста, галерея его картинок с лайтбоксом, ссылка на источник. */
export const NewsItemScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, dir } = useLang('content');
  const q = useGetNewsItemQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const lightbox = useLightbox(q.data?.images?.length ?? 0, dir);
  return (
    <NewsItemView
      item={q.data}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      {...lightbox}
    />
  );
};
