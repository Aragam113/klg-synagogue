import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { useLightbox } from '@/screens/album/use-lightbox';
import { NEWS_PAGES_KEY } from '@/screens/news/model';
import { asApiError } from '@/store';
import { useGetNewsItemQuery, useGetNewsQuery } from '@/store/api/content';

import { backToList, moreNews, postGallery } from './model';
import { NewsItemView } from './view';

/** Страница ленты, на которой был посетитель (её запоминает /news), или null. */
const savedPages = (): number | null => {
  try {
    const n = Number(window.sessionStorage.getItem(NEWS_PAGES_KEY));
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

/** Копирование в буфер: Clipboard API, иначе execCommand через временное поле. */
const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;inset-block-start:-100px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
};

/** /news/[slug] — пост, кадры с лайтбоксом, соседи, «Ещё новости», «Поделиться». */
export const NewsItemScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang, dir } = useLang('content');
  const s = String(slug ?? '');
  const q = useGetNewsItemQuery({ lang, slug: s }, { skip: !slug });
  const feed = useGetNewsQuery({ lang, page: 1, limit: 6 });
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const item = q.data;
  const photos = postGallery(item?.images, item?.cover).photos;
  const lightbox = useLightbox(photos.length, dir);

  const [canShare, setCanShare] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [backHref, setBackHref] = useState('/news');
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    setShareUrl(window.location.href.split('#')[0]);
    setBackHref(backToList(savedPages(), s));
  }, [s]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const say = (text: string) => {
    setToast(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  };
  const onCopy = async () =>
    say((await copyText(shareUrl)) ? t('news.copied') : t('news.copyFailed'));
  const onShare = async () => {
    try {
      await navigator.share({ title: item?.title, url: shareUrl });
    } catch (e) {
      // отмена пользователем — молча; иначе (нет разрешения) — хотя бы копия ссылки
      if ((e as Error)?.name !== 'AbortError') void onCopy();
    }
  };

  const neighbours = [item?.prev?.slug, item?.next?.slug].filter((x): x is string => !!x);
  return (
    <NewsItemView
      item={item}
      notFound={error?.status === 404}
      error={error?.status === 404 ? null : error}
      onRetry={q.refetch}
      more={moreNews(feed.data?.items ?? [], s, neighbours)}
      backHref={backHref}
      canShare={canShare}
      shareUrl={shareUrl}
      onShare={onShare}
      onCopy={onCopy}
      toast={toast}
      {...lightbox}
    />
  );
};
