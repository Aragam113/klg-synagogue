import { useLang } from '@/i18n/use-lang';
import { Linked } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { type Photo, mediaUrl } from '@/store/api/content';
import {
  Button,
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  FallbackBadge,
  Link,
  Page,
  Section,
  Title,
} from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { type AlbumViewProps, uniqueCredits } from './model';

const Lightbox = ({
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

export const AlbumView = ({
  album,
  loading,
  notFound,
  error,
  onRetry,
  open,
  onOpen,
  onStep,
}: AlbumViewProps) => {
  const { t } = useLang('content');
  const photos = album?.photos ?? [];
  const credits = uniqueCredits(photos);
  return (
    <Page title={`${album?.title ?? t('gallery.eyebrow')} — ${t('common:site.name')}`}>
      <Section tone="cream" pattern>
        <Container>
          <Link href="/gallery" className="cnt-back">
            ← {t('gallery.back')}
          </Link>
          {notFound ? (
            <Empty title={t('notFound')}>
              <Button href="/gallery" variant="ghost" arrow>
                {t('gallery.back')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {album ? (
            <Reveal>
              <Eyebrow>{t('gallery.photos', { n: photos.length })}</Eyebrow>
              <Title as="h1" size="lg" text={album.title} />
              <FallbackBadge show={album.fallback} />
            </Reveal>
          ) : null}
        </Container>
      </Section>
      {album ? (
        <Section tone="canvas">
          <Container>
            {!loading && photos.length === 0 ? <Empty title={t('gallery.emptyPhotos')} /> : null}
            <div className="cnt-photos" data-testid="photos">
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
            {credits.length ? (
              <div className="cnt-credits">
                <p>{t('gallery.credits')}</p>
                <ul>
                  {credits.map((c) => (
                    <li key={c}>
                      <Linked text={c} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Container>
        </Section>
      ) : null}
      {open !== null ? (
        <Lightbox photos={photos} index={open} onClose={() => onOpen(null)} onStep={onStep} />
      ) : null}
    </Page>
  );
};
