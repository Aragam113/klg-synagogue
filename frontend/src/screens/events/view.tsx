import { useLang } from '@/i18n/use-lang';
import { HexPattern } from '@/ui/judaica';
import { Button, Container, Empty, ErrorBox, Eyebrow, Page, Section, Title } from '@/ui/kit';
import { SubscribeForm } from '@/ui/layout/slots/subscribe-form';
import { Reveal } from '@/ui/motion';

import { EventCard } from './cards';
import type { EventFeed, EventsViewProps } from './model';
import './styles';

const Feed = ({ feed, testId }: { feed: EventFeed; testId: string }) => {
  const { t } = useLang('content');
  return (
    <>
      <ErrorBox error={feed.error} onRetry={feed.onRetry} />
      <div className="cnt-grid" data-testid={testId}>
        {feed.items.map((e, i) => (
          <Reveal key={e.id} delay={(i % 3) * 0.06}>
            <EventCard event={e} />
          </Reveal>
        ))}
      </div>
      {feed.hasMore ? (
        <div className="cnt-loadmore">
          <Button variant="ghost" onPress={feed.onMore} disabled={feed.fetching}>
            {t('loadMore')}
          </Button>
        </div>
      ) : null}
    </>
  );
};

export const EventsView = ({ upcoming, past }: EventsViewProps) => {
  const { t } = useLang('content');
  const noUpcoming = !upcoming.loading && !upcoming.error && upcoming.items.length === 0;
  return (
    <Page title={`${t('events.eyebrow')}`}>
      <Section tone="ink" grain className="cnt-afisha">
        <HexPattern opacity={0.05} />
        <Container>
          <Reveal>
            <Eyebrow>{t('events.eyebrow')}</Eyebrow>
            <Title
              as="h1"
              size="xl"
              text={t('events.title')}
              italicWord={t('events.italic')}
              stroke="reveal"
            />
          </Reveal>
          {noUpcoming ? (
            <Empty title={t('events.empty')} text={t('events.emptyText')}>
              <div className="cnt-empty-sub">
                <SubscribeForm />
              </div>
              <Button href="/schedule" variant="light" arrow>
                {t('common:links.schedule')}
              </Button>
            </Empty>
          ) : null}
          <Feed feed={upcoming} testId="events-upcoming" />
        </Container>
      </Section>
      {past.items.length > 0 ? (
        <Section tone="canvas">
          <Container>
            <Reveal>
              <Title as="h2" size="lg" text={t('events.past')} />
            </Reveal>
            <Feed feed={past} testId="events-past" />
          </Container>
        </Section>
      ) : null}
    </Page>
  );
};
