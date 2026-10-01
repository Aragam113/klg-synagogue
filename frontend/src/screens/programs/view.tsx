import { useLang } from '@/i18n/use-lang';
import { Linked } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { Menorah } from '@/ui/judaica';
import {
  Button,
  Card,
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  FallbackBadge,
  Page,
  Section,
  Title,
} from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import type { ProgramsViewProps } from './model';

export const ProgramsView = ({ programs, loading, error, onRetry }: ProgramsViewProps) => {
  const { t } = useLang('content');
  return (
    <Page title={`${t('programs.title')}`}>
      <Section tone="deep" pattern className="cnt-head">
        <Container>
          <Reveal className="cnt-head__row">
            <div>
              <Eyebrow>{t('programs.eyebrow')}</Eyebrow>
              <Title
                as="h1"
                size="xl"
                text={t('programs.title')}
                italicWord={t('programs.italic')}
                stroke="reveal"
              />
            </div>
            <Menorah size="5rem" lit />
          </Reveal>
        </Container>
      </Section>
      <Section tone="cream">
        <Container>
          <ErrorBox error={error} onRetry={onRetry} />
          {!loading && !error && programs.length === 0 ? (
            <Empty title={t('programs.empty')} text={t('programs.emptyText')}>
              <Button href="/contacts" variant="ghost" arrow>
                {t('common:links.contacts')}
              </Button>
            </Empty>
          ) : null}
          <div className="cnt-grid" data-testid="programs">
            {programs.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 0.06}>
                <Card
                  media={mediaUrl(p.cover)}
                  mediaAlt={p.title}
                  className="cnt-card"
                  title={p.title}
                >
                  <dl className="cnt-info">
                    {p.audience ? (
                      <div>
                        <dt>{t('programs.audience')}</dt>
                        <dd>{p.audience}</dd>
                      </div>
                    ) : null}
                    {p.schedule ? (
                      <div>
                        <dt>{t('programs.schedule')}</dt>
                        <dd>{p.schedule}</dd>
                      </div>
                    ) : null}
                    {p.contact ? (
                      <div>
                        <dt>{t('programs.contact')}</dt>
                        <dd>
                          <Linked text={p.contact} />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <FallbackBadge show={p.fallback} />
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </Page>
  );
};
