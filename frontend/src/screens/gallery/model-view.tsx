import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetAlbumsQuery } from '@/store/api/content';

import { GalleryView } from './view';

/** /gallery */
export const GalleryScreen = () => {
  const { lang } = useLang('content');
  const q = useGetAlbumsQuery({ lang });
  return (
    <GalleryView
      albums={q.data ?? []}
      loading={q.isLoading}
      error={q.error ? (asApiError(q.error) ?? null) : null}
      onRetry={q.refetch}
    />
  );
};
