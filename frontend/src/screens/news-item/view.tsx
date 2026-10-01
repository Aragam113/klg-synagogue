import { useLang } from '@/i18n/use-lang';
import { formatDay } from '@/screens/events/content-model';
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

import type { NewsItemViewProps } from './model';

export const NewsItemView = ({ item, notFound, error, onRetry }: NewsItemViewProps) => {
  const { t, lang } = useLang('content');
  return (
    <Page title={`${item?.title ?? t('news.title')} — ${t('common:site.name')}`}>
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
                <Title as="h1" size="lg" text={item.title} />
                <FallbackBadge show={item.fallback} />
                {item.lead ? <Text lead>{item.lead}</Text> : null}
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
                <RichText text={item.body} />
              </Reveal>
            </article>
          ) : null}
        </Container>
      </Section>
    </Page>
  );
};
