import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetAlbumQuery } from '@/store/api/content';
import { lockScroll } from '@/ui/motion';

import { lightboxKey, stepPhoto } from './model';
import { AlbumView } from './view';

/** /gallery/[slug] — фото альбома + лайтбокс (Esc, стрелки, блок прокрутки). */
export const AlbumScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { lang, dir } = useLang('content');
  const q = useGetAlbumQuery({ lang, slug: String(slug ?? '') }, { skip: !slug });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const n = q.data?.photos.length ?? 0;
  const [open, setOpen] = useState<number | null>(null);
  const isOpen = open !== null;

  useEffect(() => {
    if (!isOpen) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      const action = lightboxKey(e.key, dir);
      if (action === null) return;
      e.preventDefault();
      if (action === 'close') setOpen(null);
      else setOpen((i) => (i === null ? i : stepPhoto(i, action, n)));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [isOpen, dir, n]);

  return (
    <AlbumView
      album={q.data}
      loading={q.isLoading}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      open={open}
      onOpen={setOpen}
      onStep={(delta) => setOpen((i) => (i === null ? i : stepPhoto(i, delta, n)))}
    />
  );
};
