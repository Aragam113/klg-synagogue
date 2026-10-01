import { useLocalSearchParams } from 'expo-router';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetAlbumQuery } from '@/store/api/content';

import { useLightbox } from './use-lightbox';
import { AlbumView } from './view';

/** /gallery/[slug] — фото альбома + лайтбокс (Esc, стрелки, блок прокрутки). */
export const AlbumScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, dir } = useLang('content');
  const q = useGetAlbumQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const lightbox = useLightbox(q.data?.photos.length ?? 0, dir);

  return (
    <AlbumView
      album={q.data}
      loading={q.isLoading}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      {...lightbox}
    />
  );
};
