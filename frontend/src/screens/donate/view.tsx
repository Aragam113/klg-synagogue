import { useLang } from '@/i18n/use-lang';
import { FundraiserCard } from '@/screens/events/cards';
import '@/screens/events/styles';
import { Rosette } from '@/ui/judaica';
import { Container, ErrorBox, Eyebrow, Page, Section, Text, Title } from '@/ui/kit';
import { Marquee, Reveal } from '@/ui/motion';

import { DonationForm } from './donation-form';
import type { DonateViewProps } from './model';
import { Requisites } from './requisites';
import './styles';

export const DonateView = ({
  supportersCount,
  requisites,
  fundraisers,
  fundraisersError,
  onRetry,
  dedications,
  testMode,
}: DonateViewProps) => {
  const { t } = useLang('payments');
  return (
    <Page title={`${t('donate.pageTitle')}`}>
      <Section tone="cream" className="don-hero">
        <div className="don-hero__rosette">
          <Rosette size="40rem" spin={120} />
        </div>
        <Container>
          <div className="don-hero__grid">
            <Reveal>
              <Eyebrow>{t('donate.eyebrow')}</Eyebrow>
              <Title
                as="h1"
                size="hero"
                stroke="reveal"
                text={t('donate.title')}
                italicWord={t('donate.italic')}
              />
              <Text lead>{t('donate.lead')}</Text>
              {supportersCount !== null ? (
                <p className="don-counter" data-supporters-count={supportersCount}>
                  {t('donate.counter', { count: supportersCount })}
                </p>
              ) : null}
              {testMode ? <p className="don-test">{t('donate.testMode')}</p> : null}
            </Reveal>
            <Reveal delay={0.12} className="don-hero__form">
              <DonationForm ctx={{ purpose: 'donation' }} />
            </Reveal>
            <Reveal className="don-aside-req">
              <Requisites requisites={requisites} />
            </Reveal>
          </div>
        </Container>
      </Section>

      <Section tone="ink" grain className="don-marquee" ariaLabel={t('donate.dedications')}>
        <Container>
          <Eyebrow>{t('donate.dedications')}</Eyebrow>
        </Container>
        {dedications.length ? (
          <Marquee items={dedications} duration={Math.max(30, dedications.length * 4)} />
        ) : (
          <Container>
            <p className="don-empty" data-dedications-empty>
              {t('donate.dedicationsEmpty')}
            </p>
          </Container>
        )}
      </Section>

      {fundraisers.length || fundraisersError ? (
        <Section tone="canvas">
          <Container>
            <div className="don-section-head">
              <Title as="h2" size="lg" text={t('donate.fundraisers')} stroke="reveal" />
            </div>
            <ErrorBox error={fundraisersError} onRetry={onRetry} />
            <div className="cnt-grid" data-fundraisers>
              {fundraisers.map((f, i) => (
                <Reveal key={f.id} delay={i * 0.06}>
                  <FundraiserCard fundraiser={f} />
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </Page>
  );
};
