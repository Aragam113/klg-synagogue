import { useLang } from '@/i18n/use-lang';
import '@/screens/donate/styles';
import { formatRub } from '@/screens/events/content-model';
import { MagenDavid } from '@/ui/judaica';
import { Button, Container, Empty, ErrorBox, Eyebrow, Page, Section, Title } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import type { ThanksViewProps } from './model';

export const ThanksView = ({
  payment: p,
  timedOut,
  notFound,
  error,
  onRetry,
  onCancelRecurring,
  canceling,
}: ThanksViewProps) => {
  const { t, lang } = useLang('payments');
  const target = p?.fundraiser?.title ?? p?.event?.title ?? (p ? t(`purpose.${p.purpose}`) : '');
  const sub = p?.subscription;
  return (
    <Page title={`${t('thanks.pageTitle')}`}>
      <Section tone="cream" pattern>
        <Container size="narrow">
          {notFound ? (
            <Empty title={t('thanks.notFound')}>
              <Button href="/donate" arrow>
                {t('thanks.toDonate')}
              </Button>
            </Empty>
          ) : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {p ? (
            <Reveal className="don-narrow">
              <MagenDavid size={44} />
              <Eyebrow>{t('thanks.eyebrow')}</Eyebrow>
              <Title
                as="h1"
                size="xl"
                stroke="reveal"
                text={t('thanks.title')}
                italicWord={t('thanks.italic')}
              />
              <p className="don-state" data-status={p.status} role="status" aria-live="polite">
                {p.status === 'pending' && timedOut ? t('thanks.timeout') : t(`thanks.${p.status}`)}
              </p>
              <dl className="don-status">
                <div>
                  <dt>{t('thanks.amount')}</dt>
                  <dd>{formatRub(p.amountRub, lang)}</dd>
                </div>
                <div>
                  <dt>{t('thanks.for')}</dt>
                  <dd>{target}</dd>
                </div>
                {p.recurring ? (
                  <div>
                    <dt>{t('thanks.recurring')}</dt>
                    <dd data-subscription={sub?.status ?? 'none'}>
                      {sub?.status === 'canceled'
                        ? t('thanks.recurringCanceled')
                        : sub
                          ? t('thanks.recurringActive')
                          : '—'}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="don-actions">
                {sub?.status === 'active' ? (
                  <Button
                    variant="ghost"
                    onPress={onCancelRecurring}
                    disabled={canceling}
                    className="don-cancel-recurring"
                  >
                    {canceling ? t('thanks.canceling') : t('thanks.cancelRecurring')}
                  </Button>
                ) : null}
                <Button href="/donate" variant="primary" arrow>
                  {p.status === 'paid' ? t('thanks.toDonate') : t('thanks.again')}
                </Button>
                <Button href="/" variant="ghost">
                  {t('thanks.home')}
                </Button>
              </div>
            </Reveal>
          ) : null}
        </Container>
      </Section>
    </Page>
  );
};
