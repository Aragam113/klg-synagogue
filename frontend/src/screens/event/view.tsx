import { type MouseEvent } from 'react';

import { useLang } from '@/i18n/use-lang';
import { EventPrice } from '@/screens/events/cards';
import { formatRub, ticketLadder } from '@/screens/events/content-model';
import { RichText } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { ArchFrame, HexPattern } from '@/ui/judaica';
import {
  Arrow,
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
import { formatDay, formatTime } from '@/utils/kld-time';

import { type EventViewProps, registerHref } from './model';
import { EventRegisterSlot } from './register-slot';

export const EventView = ({ event: e, notFound, error, onRetry, onRegister }: EventViewProps) => {
  const { t, lang } = useLang('content');
  const ladder =
    e && e.isPaid && e.priceTiers.length > 1 ? ticketLadder(e.priceTiers, e.priceTierIndex) : [];
  const register = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey) return;
    ev.preventDefault();
    onRegister();
  };
  return (
    <Page title={`${e?.title ?? t('events.eyebrow')}`}>
      <Section tone="ink" grain className="cnt-afisha">
        <HexPattern opacity={0.05} />
        <Container>
          <Link href="/events" className="cnt-back">
            ← {t('events.back')}
          </Link>
          {notFound ? (
            <Empty title={t('notFound')}>
              <Button href="/events" variant="light" arrow>
                {t('events.back')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {e ? (
            <div
              className={`cnt-event-hero${e.cover ? '' : ' cnt-event-hero--solo'}`}
              data-testid="event-item"
            >
              <Reveal>
                <Eyebrow>{t('events.eyebrow')}</Eyebrow>
                <Title as="h1" size="lg" text={e.title} />
                <FallbackBadge show={e.fallback} />
                <dl className="cnt-info cnt-info--row">
                  <div>
                    <dt>{t('events.date')}</dt>
                    <dd>{formatDay(e.startsAt, lang, { weekday: 'long' })}</dd>
                  </div>
                  <div>
                    <dt>{t('events.time')}</dt>
                    <dd>
                      {formatTime(e.startsAt, lang)}
                      {e.endsAt ? `–${formatTime(e.endsAt, lang)}` : ''}
                    </dd>
                  </div>
                  {e.place ? (
                    <div>
                      <dt>{t('events.place')}</dt>
                      <dd>{e.place}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t('events.price')}</dt>
                    <dd>
                      <EventPrice event={e} />
                    </dd>
                  </div>
                  {e.capacity ? (
                    <div>
                      <dt>{t('events.seats')}</dt>
                      <dd>{t('events.capacity', { n: e.capacity })}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="btns">
                  <a
                    href={registerHref(e.slug)}
                    className="btn btn--gold btn--lg"
                    onClick={register}
                    data-testid="event-register-link"
                  >
                    <span>{e.isPaid ? t('events.buy') : t('events.register')}</span>
                    <Arrow />
                  </a>
                </div>
              </Reveal>
              {e.cover ? (
                <Reveal delay={0.1}>
                  <ArchFrame src={mediaUrl(e.cover)} alt={e.title} ratio="4 / 5" />
                </Reveal>
              ) : null}
            </div>
          ) : null}
        </Container>
      </Section>
      {e ? (
        <Section tone="cream">
          <Container size="narrow">
            <Reveal>
              <RichText text={e.description} />
            </Reveal>
            {ladder.length ? (
              <Reveal delay={0.06}>
                <Title as="h2" size="sm" text={t('events.ladder')} />
                <ol className="cnt-ladder">
                  {ladder.map((tier, i) => (
                    <li key={i} data-state={tier.state}>
                      <span>
                        {tier.until
                          ? t('events.until', { date: formatDay(`${tier.until}T12:00:00Z`, lang) })
                          : t('events.later')}
                      </span>
                      <b>{formatRub(tier.priceRub, lang)}</b>
                    </li>
                  ))}
                </ol>
              </Reveal>
            ) : null}
            <div id="register" className="cnt-register" data-testid="event-register">
              <EventRegisterSlot event={e} />
            </div>
          </Container>
        </Section>
      ) : null}
    </Page>
  );
};
