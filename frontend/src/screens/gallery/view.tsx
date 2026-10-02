import { useLang } from '@/i18n/use-lang';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { GHOST_WORDS as GW, GhostField, ArchFrame } from '@/ui/judaica';
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

import type { GalleryViewProps } from './model';

export const GalleryView = ({ albums, loading, error, onRetry }: GalleryViewProps) => {
  const { t } = useLang('content');
  return (
    <Page title={`${t('gallery.eyebrow')}`}>
      <Section tone="deep" pattern className="cnt-head">
        <GhostField
          seed="gallery"
          words={[GW.tmunot, GW.zachor, GW.beitKnesset, GW.kehila, GW.yerushalayim]}
          tone="dark"
          titleAt="start"
          density={{ desk: 5, phone: 2 }}
        />
        <Container>
          <Reveal>
            <Eyebrow>{t('gallery.eyebrow')}</Eyebrow>
            <Title
              as="h1"
              size="xl"
              text={t('gallery.title')}
              italicWord={t('gallery.italic')}
              stroke="reveal"
            />
          </Reveal>
        </Container>
      </Section>
      <Section tone="cream">
        <Container>
          <ErrorBox error={error} onRetry={onRetry} />
          {!loading && !error && albums.length === 0 ? (
            <Empty title={t('gallery.empty')}>
              <Button href="/history" variant="ghost" arrow>
                {t('common:links.history')}
              </Button>
            </Empty>
          ) : null}
          <div className="cnt-albums" data-testid="albums">
            {albums.map((a, i) => (
              <Reveal key={a.id} delay={(i % 3) * 0.08}>
                <Link href={`/gallery/${a.slug}`} className="cnt-album">
                  <ArchFrame src={mediaUrl(a.cover)} alt={a.title} ratio="3 / 4" />
                  <span className="cnt-album__title">{a.title}</span>
                  <span className="cnt-album__count">
                    {t('gallery.photos', { n: a.photosCount })}
                  </span>
                  <FallbackBadge show={a.fallback} />
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </Page>
  );
};
