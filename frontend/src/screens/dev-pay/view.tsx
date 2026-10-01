import { useLang } from '@/i18n/use-lang';
import '@/screens/donate/styles';
import { formatRub } from '@/screens/events/content-model';
import { Button, Container, Empty, ErrorBox, Eyebrow, Page, Section, Text, Title } from '@/ui/kit';

import type { DevPayViewProps } from './model';

export const DevPayView = ({
  payment: p,
  notFound,
  error,
  onRetry,
  busy,
  onAction,
  thanksHref,
}: DevPayViewProps) => {
  const { t, lang } = useLang('payments');
  const target = p?.fundraiser?.title ?? p?.event?.title ?? (p ? t(`purpose.${p.purpose}`) : '');
  return (
    <Page title={`${t('devPay.pageTitle')}`}>
      <Section tone="deep" grain>
        <Container size="narrow">
          {notFound ? <Empty title={t('devPay.notFound')} /> : null}
          <ErrorBox error={error} onRetry={onRetry} />
          {p ? (
            <div className="don-narrow" data-dev-pay>
              <Eyebrow>{t('devPay.eyebrow')}</Eyebrow>
              <Title as="h1" size="lg" text={t('devPay.title')} />
              <Text>{t('devPay.lead')}</Text>
              <dl className="don-status">
                <div>
                  <dt>{t('devPay.amount')}</dt>
                  <dd data-amount={p.amountRub}>{formatRub(p.amountRub, lang)}</dd>
                </div>
                <div>
                  <dt>{t('devPay.for')}</dt>
                  <dd>
                    {target}
                    {p.recurring ? ` · ${t('form.monthly')}` : ''}
                  </dd>
                </div>
              </dl>
              {p.status === 'pending' ? (
                <div className="don-actions">
                  <Button
                    variant="gold"
                    size="lg"
                    onPress={() => onAction('pay')}
                    disabled={busy}
                    className="dev-pay__pay"
                  >
                    {busy ? t('devPay.busy') : t('devPay.pay')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onPress={() => onAction('cancel')}
                    disabled={busy}
                    className="dev-pay__cancel"
                  >
                    {t('devPay.cancel')}
                  </Button>
                </div>
              ) : (
                <>
                  <Text>{t('devPay.done')}</Text>
                  <Button href={thanksHref} variant="light" arrow>
                    {t('devPay.toThanks')}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </Container>
      </Section>
    </Page>
  );
};
