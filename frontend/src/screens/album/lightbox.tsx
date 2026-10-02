import { type KeyboardEvent, type MouseEvent, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { useLang } from '@/i18n/use-lang';
import { shortUrl } from '@/screens/events/content-model';
import { Linked } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { type Photo, mediaUrl } from '@/store/api/content';

/** Сетка миниатюр: клик открывает кадр в лайтбоксе (альбом галереи, галерея новости). */
export const PhotoGrid = ({
  photos,
  onOpen,
  testId,
  className,
  indexes,
  variant = 'masonry',
  total,
}: {
  /** Всего кадров в лайтбоксе (для подписи миниатюры), если галерея показывает не все. */
  total?: number;
  photos: Photo[];
  /** Номер кадра в лайтбоксе для каждой миниатюры (по умолчанию — её позиция). */
  indexes?: number[];
  /** masonry — колонки по высоте кадров (альбом), grid — ровная сетка (галерея поста). */
  variant?: 'masonry' | 'grid';
  onOpen: (i: number) => void;
  testId?: string;
  /** Дополнительный класс обёртки (отступы в контексте страницы). */
  className?: string;
}) => {
  const { t } = useLang('content');
  return (
    <div
      className={['cnt-photos', variant === 'grid' ? 'cnt-photos--grid' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      data-testid={testId}
    >
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className="cnt-photo"
          onClick={() => onOpen(indexes?.[i] ?? i)}
          aria-label={
            p.caption ??
            t('gallery.counter', { i: (indexes?.[i] ?? i) + 1, n: total ?? photos.length })
          }
        >
          <img src={mediaUrl(p.file)} alt={p.caption ?? ''} loading="lazy" />
        </button>
      ))}
    </div>
  );
};

/** Лайтбокс кадров: счётчик, подпись, авторство/пост-источник, свайп, предзагрузка соседей, фокус-ловушка. */
export const Lightbox = ({
  photos,
  index,
  onClose,
  onStep,
  creditLabel,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
  /** Текст ссылки, если авторство кадра — URL (у новости — «Пост в Telegram»); иначе URL коротко. */
  creditLabel?: string;
}) => {
  const { t, dir } = useLang('content');
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const p = photos[index];
  const n = photos.length;

  // фокус внутрь при открытии и обратно на кнопку-источник при закрытии
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>('.lbx__close')?.focus();
    return () => back?.focus?.();
  }, []);

  // соседние кадры грузятся заранее — листание без пустого экрана
  useEffect(() => {
    if (n < 2) return;
    for (const d of [1, -1]) {
      const q = photos[(index + d + n) % n];
      if (q) new Image().src = mediaUrl(q.file) ?? '';
    }
  }, [index, n, photos]);

  if (!p) return null;
  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>('button, a[href]')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const closeOnBackdrop = (e: MouseEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  const isUrl = !!p.credit && /^https?:\/\/\S+$/.test(p.credit);
  // в body: страница — свои контексты наложения (Reveal, секции), z-index изнутри их не перекрывает
  return createPortal(
    <div
      ref={box}
      className="lbx"
      role="dialog"
      aria-modal="true"
      aria-label={p.caption ?? t('gallery.eyebrow')}
      data-testid="lightbox"
      onClick={closeOnBackdrop}
      onKeyDown={trap}
      onTouchStart={(e) => {
        const tp = e.touches[0];
        touch.current = tp ? { x: tp.clientX, y: tp.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const s = touch.current;
        const tp = e.changedTouches[0];
        touch.current = null;
        if (!s || !tp || n < 2) return;
        const dx = tp.clientX - s.x;
        const dy = tp.clientY - s.y;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        // свайп влево — следующий кадр; в RTL зеркально
        onStep((dx < 0 ? 1 : -1) * (dir === 'rtl' ? -1 : 1));
      }}
    >
      <div className="lbx__stage" onClick={closeOnBackdrop}>
        <img key={p.id} src={mediaUrl(p.file)} alt={p.caption ?? ''} draggable={false} />
      </div>
      <div className="lbx__cap" onClick={closeOnBackdrop}>
        <span
          className="lbx__count"
          data-testid="lightbox-counter"
          dir="ltr"
          aria-label={t('gallery.counter', { i: index + 1, n })}
        >
          <bdi>{index + 1}</bdi> / <bdi>{n}</bdi>
        </span>
        {p.caption ? <span className="lbx__caption">{p.caption}</span> : null}
        {p.credit ? (
          <small className="lbx__credit">
            {isUrl ? (
              <a href={p.credit} target="_blank" rel="noopener noreferrer">
                {creditLabel ?? shortUrl(p.credit)} <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Linked text={p.credit} />
            )}
          </small>
        ) : null}
      </div>
      <button
        type="button"
        className="lbx__btn lbx__close"
        onClick={onClose}
        aria-label={t('gallery.close')}
      >
        ×
      </button>
      {n > 1 ? (
        <>
          <button
            type="button"
            className="lbx__btn lbx__prev"
            onClick={() => onStep(-1)}
            aria-label={t('gallery.prev')}
          >
            <span className="lbx__chev">‹</span>
          </button>
          <button
            type="button"
            className="lbx__btn lbx__next"
            onClick={() => onStep(1)}
            aria-label={t('gallery.next')}
          >
            <span className="lbx__chev">›</span>
          </button>
        </>
      ) : null}
    </div>,
    document.body
  );
};
