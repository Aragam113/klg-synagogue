import { useLang } from '@/i18n/use-lang';
import { Lightbox, PhotoGrid } from '@/screens/album/lightbox';
import { NewsCard } from '@/screens/events/cards';
import { RichText } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl, type NewsNeighbour } from '@/store/api/content';
import { MagenDavid } from '@/ui/judaica';
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
import { formatDay, formatHebrewDay } from '@/utils/kld-time';

import {
  type NewsItemViewProps,
  bodyWithoutTitle,
  cleanTitle,
  coverFrame,
  extraSources,
  leadRepeatsBody,
  postGallery,
  readingMinutes,
  shareLinks,
  sourceChannel,
} from './model';

/** Стрелка «назад/вперёд»: в RTL зеркалится CSS (.nws-flip). */
const Arrow = ({ to }: { to: 'back' | 'fwd' }) => (
  <span className="nws-flip" aria-hidden="true">
    {to === 'back' ? '←' : '→'}
  </span>
);

/** Карточка соседней новости: миниатюра, направление, заголовок. */
const Neighbour = ({ n, side }: { n: NewsNeighbour; side: 'prev' | 'next' }) => {
  const { t } = useLang('content');
  return (
    <Link href={`/news/${n.slug}`} className={`nws-nb nws-nb--${side}`}>
      <span className="nws-nb__thumb">
        {n.cover ? <img src={mediaUrl(n.cover)} alt="" loading="lazy" /> : <MagenDavid size={22} />}
      </span>
      <span className="nws-nb__text">
        <small>
          {side === 'prev' ? <Arrow to="back" /> : null} {t(`news.${side}`)}{' '}
          {side === 'next' ? <Arrow to="fwd" /> : null}
        </small>
        <b>{cleanTitle(n.title)}</b>
      </span>
    </Link>
  );
};

/** Кнопки «Поделиться»: системное меню (Web Share) или Telegram/WhatsApp/VK; копирование — всегда. */
const Share = ({
  title,
  canShare,
  shareUrl,
  onShare,
  onCopy,
}: {
  title: string;
  canShare: boolean;
  shareUrl: string;
  onShare: () => void;
  onCopy: () => void;
}) => {
  const { t } = useLang('content');
  const links = shareLinks(shareUrl, title);
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  return (
    <div className="nws-share" data-testid="news-share">
      <span className="nws-share__label">{t('news.share')}</span>
      {canShare ? (
        <button type="button" className="nws-chip" onClick={onShare} data-testid="share-native">
          {t('news.share')} <span aria-hidden="true">↗</span>
        </button>
      ) : (
        <>
          <a
            className="nws-chip"
            href={links.telegram}
            {...ext}
            aria-label={t('news.shareVia', { name: 'Telegram' })}
          >
            Telegram
          </a>
          <a
            className="nws-chip"
            href={links.whatsapp}
            {...ext}
            aria-label={t('news.shareVia', { name: 'WhatsApp' })}
          >
            WhatsApp
          </a>
          <a
            className="nws-chip"
            href={links.vk}
            {...ext}
            aria-label={t('news.shareVia', { name: 'VK' })}
          >
            VK
          </a>
        </>
      )}
      <button type="button" className="nws-chip" onClick={onCopy} data-testid="share-copy">
        {t('news.copyLink')}
      </button>
    </div>
  );
};

export const NewsItemView = ({
  item,
  notFound,
  error,
  onRetry,
  open,
  onOpen,
  onStep,
  more,
  backHref,
  canShare,
  shareUrl,
  onShare,
  onCopy,
  toast,
}: NewsItemViewProps) => {
  const { t, lang } = useLang('content');
  const { photos, gallery } = postGallery(item?.images, item?.cover);
  const channel = sourceChannel(item?.sourceUrl);
  const extra = extraSources(item?.images, item?.sourceUrl);
  const body = item ? bodyWithoutTitle(item.body ?? '', item.title) : '';
  const title = item ? cleanTitle(item.title) || item.title : t('news.title');
  const coverImg = item?.images?.find((im) => im.url === item.cover);
  const frame = coverFrame(coverImg?.width, coverImg?.height);
  // русский фолбэк на he: направление по самому тексту, иначе пунктуация уезжает («!Бар-мицва»)
  const textDir = item?.fallback ? 'auto' : undefined;
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  return (
    <Page title={title}>
      <Section tone="cream" pattern className="nws-top">
        <Container size="narrow">
          <nav className="nws-crumbs" aria-label={t('news.crumbs')} data-testid="news-crumbs">
            <ol>
              <li>
                <Link href="/">{t('news.home')}</Link>
              </li>
              <li>
                <Link href={backHref}>{t('news.eyebrow')}</Link>
              </li>
              {item ? (
                <li aria-current="page" dir={textDir}>
                  {title}
                </li>
              ) : null}
            </ol>
          </nav>
          {notFound ? (
            <Empty title={t('notFound')}>
              <Button href="/news" variant="ghost" arrow>
                {t('news.back')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {item ? (
            <article className="nws" data-testid="news-item">
              <Reveal>
                <header className="nws-head">
                  <p className="nws-meta">
                    {item.kind === 'announcement' ? (
                      <span className="nws-tag">{t('news.announcement')}</span>
                    ) : null}
                    {item.publishedAt ? (
                      <>
                        <time dateTime={item.publishedAt}>{formatDay(item.publishedAt, lang)}</time>
                        <span className="nws-hdate" data-testid="news-hebrew-date">
                          {formatHebrewDay(item.publishedAt, lang)}
                        </span>
                      </>
                    ) : null}
                    <span>
                      {t('news.readTime', { n: readingMinutes(`${item.lead ?? ''} ${body}`) })}
                    </span>
                  </p>
                  <div dir={textDir}>
                    <Title as="h1" size="lg" text={title} />
                  </div>
                  <FallbackBadge show={item.fallback} />
                  {item.lead && !leadRepeatsBody(item.lead, body) ? (
                    <p className="nws-lead" dir={textDir}>
                      {item.lead}
                    </p>
                  ) : null}
                  {item.sourceUrl ? (
                    <p className="nws-from" data-testid="news-source">
                      {t('news.fromTelegram')}{' '}
                      <a href={item.sourceUrl} {...ext}>
                        {channel ? `@${channel}` : item.sourceUrl}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    </p>
                  ) : null}
                </header>
              </Reveal>
              {item.cover ? (
                <Reveal delay={0.06}>
                  <figure className="nws-cover" data-fit={frame.fit}>
                    <button
                      type="button"
                      className="nws-cover__btn"
                      style={{ aspectRatio: String(frame.ratio) }}
                      onClick={() => onOpen(0)}
                      aria-label={t('news.openPhoto')}
                      data-testid="news-cover"
                    >
                      {frame.fit === 'contain' ? (
                        <img
                          className="nws-cover__blur"
                          src={mediaUrl(item.cover)}
                          alt=""
                          aria-hidden="true"
                        />
                      ) : null}
                      <img className="nws-cover__img" src={mediaUrl(item.cover)} alt={title} />
                      {photos.length > 1 ? (
                        <span className="nws-cover__count" aria-hidden="true" dir="ltr">
                          1 / {photos.length}
                        </span>
                      ) : null}
                    </button>
                    {item.sourceUrl ? (
                      <figcaption>
                        {t('news.fromTelegram')}{' '}
                        <a href={photos[0]?.credit ?? item.sourceUrl} {...ext}>
                          {channel ? `@${channel}` : t('news.postLink')}
                        </a>
                      </figcaption>
                    ) : null}
                  </figure>
                </Reveal>
              ) : null}
              <Reveal delay={0.1}>
                <div dir={textDir}>
                  <RichText text={body} className="nws-body" />
                </div>
              </Reveal>
              {gallery.length ? (
                <section className="nws-gallery" data-testid="news-photos">
                  <Eyebrow>{t('news.morePhotos', { n: gallery.length })}</Eyebrow>
                  <PhotoGrid
                    variant="grid"
                    photos={gallery.map((g) => g.photo)}
                    indexes={gallery.map((g) => g.index)}
                    total={photos.length}
                    onOpen={onOpen}
                  />
                </section>
              ) : null}
              <Share
                title={title}
                canShare={canShare}
                shareUrl={shareUrl}
                onShare={onShare}
                onCopy={onCopy}
              />
              {extra.length ? (
                <p className="cnt-credits">
                  {t('news.morePosts')}{' '}
                  {extra.map((u, i) => (
                    <span key={u}>
                      {i ? ', ' : ''}
                      <a href={u} {...ext}>
                        {u.replace(/^https:\/\//, '')}
                      </a>
                    </span>
                  ))}
                </p>
              ) : null}
            </article>
          ) : null}
        </Container>
      </Section>
      {item ? (
        <Section tone="canvas" className="nws-after">
          <Container size="narrow">
            <nav className="nws-nav" aria-label={t('news.postNav')} data-testid="news-nav">
              <Link href={backHref} className="nws-back" ariaLabel={t('news.back')}>
                <Arrow to="back" /> {t('news.back')}
              </Link>
              {item.prev || item.next ? (
                <div className="nws-nbs">
                  {item.prev ? <Neighbour n={item.prev} side="prev" /> : <span />}
                  {item.next ? <Neighbour n={item.next} side="next" /> : <span />}
                </div>
              ) : null}
            </nav>
          </Container>
          {more.length ? (
            <Container size="narrow">
              <section className="nws-more" data-testid="news-more">
                <Reveal>
                  <Eyebrow>{t('news.more')}</Eyebrow>
                </Reveal>
                <div className="cnt-grid">
                  {more.map((n, i) => (
                    <Reveal key={n.id} delay={i * 0.06}>
                      <NewsCard item={n} />
                    </Reveal>
                  ))}
                </div>
              </section>
            </Container>
          ) : null}
        </Section>
      ) : null}
      {channel ? (
        <Section tone="deep" className="nws-tg">
          <Container size="narrow">
            <Reveal>
              <div className="nws-tg__row" data-testid="news-telegram">
                <div>
                  <Title as="h2" size="md" text={t('news.tgTitle')} />
                  <p className="nws-tg__text">{t('news.tgText')}</p>
                </div>
                <Button href={`https://t.me/${channel}`} variant="light" arrow>
                  {t('news.tgButton')} @{channel}
                </Button>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}
      {open !== null ? (
        <Lightbox
          photos={photos}
          index={open}
          onClose={() => onOpen(null)}
          onStep={onStep}
          creditLabel={t('news.postLink')}
        />
      ) : null}
      <div
        className="nws-toast"
        role="status"
        aria-live="polite"
        data-testid="toast"
        data-show={toast ? '' : undefined}
      >
        {toast}
      </div>
    </Page>
  );
};
