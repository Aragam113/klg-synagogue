import { useLang } from '@/i18n/use-lang';
import { Lightbox, PhotoGrid } from '@/screens/album/lightbox';
import { RichText } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { ArchFrame } from '@/ui/judaica';
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
  Text,
  Title,
} from '@/ui/kit';
import { Reveal } from '@/ui/motion';
import { formatDay } from '@/utils/kld-time';

import {
  type NewsItemViewProps,
  bodyWithoutTitle,
  extraSources,
  leadRepeatsBody,
  newsPhotos,
  sourceChannel,
} from './model';

export const NewsItemView = ({
  item,
  notFound,
  error,
  onRetry,
  open,
  onOpen,
  onStep,
}: NewsItemViewProps) => {
  const { t, lang } = useLang('content');
  const photos = newsPhotos(item?.images);
  const channel = sourceChannel(item?.sourceUrl);
  const more = extraSources(item?.images, item?.sourceUrl);
  const body = item ? bodyWithoutTitle(item.body ?? '', item.title) : '';
  // русский фолбэк на he: направление по самому тексту, иначе пунктуация уезжает («!Бар-мицва»)
  const textDir = item?.fallback ? 'auto' : undefined;
  return (
    <Page title={`${item?.title ?? t('news.title')}`}>
      <Section tone="cream" pattern>
        <Container size="narrow">
          <Link href="/news" className="cnt-back">
            ← {t('news.back')}
          </Link>
          {notFound ? (
            <Empty title={t('notFound')}>
              <Button href="/news" variant="ghost" arrow>
                {t('news.back')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {item ? (
            <article className="cnt-article" data-testid="news-item">
              <Reveal>
                <Eyebrow>
                  {item.kind === 'announcement' ? `${t('news.announcement')} · ` : ''}
                  {item.publishedAt ? formatDay(item.publishedAt, lang) : t('news.eyebrow')}
                </Eyebrow>
                <div dir={textDir}>
                  <Title as="h1" size="lg" text={item.title} />
                </div>
                <FallbackBadge show={item.fallback} />
                {item.lead && !leadRepeatsBody(item.lead, body) ? (
                  <div dir={textDir}>
                    <Text lead>{item.lead}</Text>
                  </div>
                ) : null}
              </Reveal>
              {item.cover ? (
                <Reveal delay={0.08}>
                  <ArchFrame
                    src={mediaUrl(item.cover)}
                    alt={item.title}
                    ratio="16 / 10"
                    className="cnt-cover"
                  />
                </Reveal>
              ) : null}
              <Reveal delay={0.12}>
                <div dir={textDir}>
                  <RichText text={body} />
                </div>
              </Reveal>
              {photos.length > 1 ? (
                <section className="cnt-post-gallery" data-testid="news-photos">
                  <Eyebrow>{t('news.photos')}</Eyebrow>
                  <PhotoGrid photos={photos} onOpen={onOpen} />
                </section>
              ) : null}
              {item.sourceUrl ? (
                <p className="cnt-credits" data-testid="news-source">
                  {t('news.source')}{' '}
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {channel ? `@${channel}` : item.sourceUrl}
                  </a>
                  {more.length ? (
                    <>
                      {' · '}
                      {t('news.morePosts')}{' '}
                      {more.map((u, i) => (
                        <span key={u}>
                          {i ? ', ' : ''}
                          <a href={u} target="_blank" rel="noopener noreferrer">
                            {u.replace(/^https:\/\//, '')}
                          </a>
                        </span>
                      ))}
                    </>
                  ) : null}
                </p>
              ) : null}
            </article>
          ) : null}
        </Container>
      </Section>
      {open !== null ? (
        <Lightbox photos={photos} index={open} onClose={() => onOpen(null)} onStep={onStep} />
      ) : null}
    </Page>
  );
};
