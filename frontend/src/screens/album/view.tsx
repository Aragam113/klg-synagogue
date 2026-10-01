import { useLang } from '@/i18n/use-lang';
import { Linked } from '@/screens/events/rich-text';
import '@/screens/events/styles';
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

import { Lightbox, PhotoGrid } from './lightbox';
import { type AlbumViewProps, uniqueCredits } from './model';

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
    <Page title={`${album?.title ?? t('gallery.eyebrow')}`}>
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
            <PhotoGrid photos={photos} onOpen={onOpen} testId="photos" />
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
