import { useLang } from '@/i18n/use-lang';
import { DonationForm } from '@/screens/donate/donation-form';
import { Requisites } from '@/screens/donate/requisites';
import '@/screens/donate/styles';
import { formatRub, fundraiserProgress } from '@/screens/events/content-model';
import { RichText } from '@/screens/events/rich-text';
import '@/screens/events/styles';
import { mediaUrl } from '@/store/api/content';
import { ArchFrame, Rosette } from '@/ui/judaica';
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

import type { FundraiserViewProps } from './model';

export const FundraiserView = ({
  fundraiser: f,
  notFound,
  error,
  onRetry,
  requisites,
}: FundraiserViewProps) => {
  const { t, lang } = useLang('payments');
  const progress = f ? fundraiserProgress(f) : null;
  return (
    <Page title={`${f?.title ?? t('fundraiser.eyebrow')}`}>
      <Section tone="cream" pattern className="don-hero">
        <div className="don-hero__rosette">
          <Rosette size="40rem" spin={120} />
        </div>
        <Container>
          <Link href="/donate" className="cnt-back">
            ← {t('fundraiser.back')}
          </Link>
          {notFound ? (
            <Empty title={t('fundraiser.notFound')}>
              <Button href="/donate" arrow>
                {t('fundraiser.back')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {f && progress ? (
            <div className="don-hero__grid" data-fundraiser={f.slug}>
              <Reveal>
                <Eyebrow>{t('fundraiser.eyebrow')}</Eyebrow>
                <Title as="h1" size="lg" stroke="reveal" text={f.title} />
                <FallbackBadge show={f.fallback} />
                <div
                  className="cnt-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  style={{ ['--fill' as string]: `${progress.percent}%` }}
                >
                  <span />
                </div>
                <dl className="fund-nums">
                  <div>
                    <dt>{t('fundraiser.raised')}</dt>
                    <dd data-raised={f.raisedRub}>
                      {formatRub(f.raisedRub, lang)} · {progress.percent}%
                    </dd>
                  </div>
                  <div>
                    <dt>{t('fundraiser.goal')}</dt>
                    <dd>{formatRub(f.goalRub, lang)}</dd>
                  </div>
                  <div>
                    <dt>{t('fundraiser.left')}</dt>
                    <dd>{formatRub(progress.leftRub, lang)}</dd>
                  </div>
                  <div>
                    <dt>{t('fundraiser.supporters')}</dt>
                    <dd data-supporters={f.supporters}>{f.supporters}</dd>
                  </div>
                </dl>
                {f.cover ? <ArchFrame src={mediaUrl(f.cover)} alt={f.title} ratio="4 / 3" /> : null}
                <RichText text={f.body ?? ''} />
              </Reveal>
              <Reveal delay={0.12}>
                {f.status === 'active' ? (
                  <>
                    <Title as="h2" size="sm" text={t('fundraiser.donate')} />
                    <DonationForm ctx={{ purpose: 'donation', fundraiserSlug: f.slug }} />
                  </>
                ) : (
                  <Text lead>{t('fundraiser.closed')}</Text>
                )}
              </Reveal>
            </div>
          ) : null}
        </Container>
      </Section>
      {f ? (
        <Section tone="canvas">
          <Container size="narrow">
            <Requisites requisites={requisites} />
          </Container>
        </Section>
      ) : null}
    </Page>
  );
};
