import { useLang } from '@/i18n/use-lang';
import { RichText } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { Rosette } from '@/ui/judaica';
import {
  Button,
  Card,
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

import { type DepartmentsViewProps, telHref } from './model';

export const DepartmentsView = ({ departments, loading, error, onRetry }: DepartmentsViewProps) => {
  const { t } = useLang('content');
  return (
    <Page title={`${t('departments.title')}`}>
      <Section tone="cream" pattern className="cnt-head">
        <Container>
          <Reveal className="cnt-head__row">
            <div>
              <Eyebrow>{t('departments.eyebrow')}</Eyebrow>
              <Title
                as="h1"
                size="xl"
                text={t('departments.title')}
                italicWord={t('departments.italic')}
                stroke="reveal"
              />
            </div>
            <Rosette size="5rem" />
          </Reveal>
        </Container>
      </Section>
      <Section tone="canvas">
        <Container>
          <ErrorBox error={error} onRetry={onRetry} />
          {!loading && !error && departments.length === 0 ? (
            <Empty title={t('departments.empty')} text={t('departments.emptyText')}>
              <Button href="/contacts" variant="ghost" arrow>
                {t('common:links.contacts')}
              </Button>
            </Empty>
          ) : null}
          <div className="cnt-grid cnt-grid--wide" data-testid="departments">
            {departments.map((d, i) => (
              <Reveal key={d.id} delay={(i % 2) * 0.08}>
                <Card
                  media={mediaUrl(d.cover)}
                  mediaAlt={d.title}
                  className="cnt-card"
                  title={d.title}
                >
                  <RichText text={d.description} />
                  <dl className="cnt-info">
                    {d.address ? (
                      <div>
                        <dt>{t('departments.address')}</dt>
                        <dd>{d.address}</dd>
                      </div>
                    ) : null}
                    {d.phones.length ? (
                      <div>
                        <dt>{t('departments.phone')}</dt>
                        <dd className="cnt-phones">
                          {d.phones.map((p) => (
                            <Link key={p} href={telHref(p)}>
                              <bdi>{p}</bdi>
                            </Link>
                          ))}
                        </dd>
                      </div>
                    ) : null}
                    {d.email ? (
                      <div>
                        <dt>{t('departments.email')}</dt>
                        <dd>
                          <Link href={`mailto:${d.email}`}>{d.email}</Link>
                        </dd>
                      </div>
                    ) : null}
                    {d.hours ? (
                      <div>
                        <dt>{t('departments.hours')}</dt>
                        <dd className="cnt-hours">{d.hours}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <FallbackBadge show={d.fallback} />
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>
    </Page>
  );
};
