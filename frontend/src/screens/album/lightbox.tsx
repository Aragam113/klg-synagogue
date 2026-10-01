import { useLang } from '@/i18n/use-lang';
import { Linked } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { type Photo, mediaUrl } from '@/store/api/content';

/** Сетка миниатюр: клик открывает кадр в лайтбоксе (альбом галереи, галерея новости). */
export const PhotoGrid = ({
  photos,
  onOpen,
  testId,
  className,
}: {
  photos: Photo[];
  onOpen: (i: number) => void;
  testId?: string;
  /** Дополнительный класс обёртки (отступы в контексте страницы). */
  className?: string;
}) => {
  const { t } = useLang('content');
  return (
    <div className={className ? `cnt-photos ${className}` : 'cnt-photos'} data-testid={testId}>
      {photos.map((p, i) => (
        <button
          key={p.id}
          type="button"
          className="cnt-photo"
          onClick={() => onOpen(i)}
          aria-label={p.caption ?? t('gallery.counter', { i: i + 1, n: photos.length })}
        >
          <img src={mediaUrl(p.file)} alt={p.caption ?? ''} loading="lazy" />
        </button>
      ))}
    </div>
  );
};

/** Лайтбокс кадров: счётчик, подпись, авторство; Esc/стрелки — в useLightbox. */
export const Lightbox = ({
  photos,
  index,
  onClose,
  onStep,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) => {
  const { t } = useLang('content');
  const p = photos[index];
  if (!p) return null;
  return (
    <div
      className="lbx"
      role="dialog"
      aria-modal="true"
      aria-label={p.caption ?? t('gallery.eyebrow')}
      data-testid="lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="lbx__stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img src={mediaUrl(p.file)} alt={p.caption ?? ''} />
      </div>
      <div className="lbx__cap">
        <span className="lbx__count">
          {t('gallery.counter', { i: index + 1, n: photos.length })}
        </span>
        {p.caption ? <span> · {p.caption}</span> : null}
        {p.credit ? (
          <small>
            <Linked text={p.credit} />
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
      {photos.length > 1 ? (
        <>
          <button
            type="button"
            className="lbx__btn lbx__prev"
            onClick={() => onStep(-1)}
            aria-label={t('gallery.prev')}
          >
            ‹
          </button>
          <button
            type="button"
            className="lbx__btn lbx__next"
            onClick={() => onStep(1)}
            aria-label={t('gallery.next')}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
};
