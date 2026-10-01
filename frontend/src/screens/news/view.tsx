import { useLang } from '@/i18n/use-lang';
import { NewsCard } from '@/screens/events/cards';
import '@/screens/events/styles';
import { Button, Container, Empty, ErrorBox, Eyebrow, Page, Section, Title } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import type { NewsViewProps } from './model';

export const NewsView = ({
  items,
  loading,
  fetching,
  hasMore,
  onMore,
  error,
  onRetry,
}: NewsViewProps) => {
  const { t } = useLang('content');
  return (
    <Page title={`${t('news.title')}`}>
      <Section tone="cream" pattern className="cnt-head">
        <Container>
          <Reveal>
            <Eyebrow>{t('news.eyebrow')}</Eyebrow>
            <Title
              as="h1"
              size="xl"
              text={t('news.title')}
              italicWord={t('news.italic')}
              stroke="reveal"
            />
          </Reveal>
        </Container>
      </Section>
      <Section tone="canvas">
        <Container>
          <ErrorBox error={error} onRetry={onRetry} />
          {!loading && !error && items.length === 0 ? (
            <Empty title={t('news.empty')} text={t('news.emptyText')}>
              <Button href="/events" variant="ghost" arrow>
                {t('common:links.events')}
              </Button>
            </Empty>
          ) : null}
          <div className="cnt-grid" data-testid="news-list">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={(i % 3) * 0.06}>
                <NewsCard item={item} />
              </Reveal>
            ))}
          </div>
          {hasMore ? (
            <div className="cnt-loadmore">
              <Button variant="ghost" onPress={onMore} disabled={fetching}>
                {t('loadMore')}
              </Button>
            </div>
          ) : null}
        </Container>
      </Section>
    </Page>
  );
};
