import { useLang } from '@/i18n/use-lang';
import { type EventItem, type Fundraiser, mediaUrl, type NewsItem } from '@/store/api/content';
import { Button, Card, FallbackBadge } from '@/ui/kit';
import { dateBadge, formatDay, formatTime } from '@/utils/kld-time';

import { formatRub, fundraiserProgress } from './content-model';
import './styles';

/** Цена события на сегодня: «Вход свободный» | «700 ₽». */
export const EventPrice = ({ event }: { event: Pick<EventItem, 'isPaid' | 'priceNow'> }) => {
  const { t, lang } = useLang('content');
  return (
    <span className="cnt-price">
      {!event.isPaid || event.priceNow === null
        ? t('events.free')
        : t('events.priceNow', { price: formatRub(event.priceNow, lang) })}
    </span>
  );
};

/** Карточка события для афиши и главной. */
export const EventCard = ({ event }: { event: EventItem }) => {
  const { t, lang } = useLang('content');
  const badge = dateBadge(event.startsAt, lang);
  return (
    <Card
      href={`/events/${event.slug}`}
      media={mediaUrl(event.cover)}
      mediaAlt={event.title}
      className="cnt-card cnt-event"
      eyebrow={
        <>
          {formatTime(event.startsAt, lang)}
          {event.place ? ` · ${event.place}` : ''}
        </>
      }
      title={event.title}
      footer={
        <>
          <EventPrice event={event} />
          <span className="cnt-more">{t('events.more')}</span>
        </>
      }
    >
      <span className="cnt-badge" aria-label={formatDay(event.startsAt, lang)}>
        <b>{badge.day}</b>
        <small>{badge.month}</small>
      </span>
      <FallbackBadge show={event.fallback} />
    </Card>
  );
};

/** Карточка новости для ленты и главной. */
export const NewsCard = ({ item }: { item: NewsItem }) => {
  const { t, lang } = useLang('content');
  return (
    <Card
      href={`/news/${item.slug}`}
      media={mediaUrl(item.cover)}
      mediaAlt={item.title}
      className="cnt-card cnt-news"
      eyebrow={
        <>
          {item.kind === 'announcement' ? `${t('news.announcement')} · ` : ''}
          {item.publishedAt ? formatDay(item.publishedAt, lang) : ''}
        </>
      }
      title={<span dir={item.fallback ? 'auto' : undefined}>{item.title}</span>}
    >
      {item.lead ? (
        <p className="text cnt-lead" dir={item.fallback ? 'auto' : undefined}>
          {item.lead}
        </p>
      ) : null}
      <FallbackBadge show={item.fallback} />
    </Card>
  );
};

/** Карточка сбора с прогрессом; кнопка «Помочь» → /fundraisers/<slug> (страница сбора с формой оплаты). */
export const FundraiserCard = ({ fundraiser: f }: { fundraiser: Fundraiser }) => {
  const { t, lang } = useLang('content');
  const { percent, leftRub } = fundraiserProgress(f);
  return (
    <Card
      media={mediaUrl(f.cover)}
      mediaAlt={f.title}
      className="cnt-card cnt-fund"
      title={f.title}
      footer={
        <Button href={`/fundraisers/${f.slug}`} arrow>
          {t('fundraisers.help')}
        </Button>
      }
    >
      <div
        className="cnt-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ ['--fill' as string]: `${percent}%` }}
      >
        <span />
      </div>
      <dl className="cnt-fund__nums">
        <div>
          <dt>{t('fundraisers.raised')}</dt>
          <dd>
            {formatRub(f.raisedRub, lang)} / {formatRub(f.goalRub, lang)}
          </dd>
        </div>
        <div>
          <dt>{t('fundraisers.left')}</dt>
          <dd>{formatRub(leftRub, lang)}</dd>
        </div>
        <div>
          <dt>{t('fundraisers.supporters')}</dt>
          <dd>{f.supporters}</dd>
        </div>
      </dl>
      <FallbackBadge show={f.fallback} />
    </Card>
  );
};
