import { type ReactNode } from 'react';

import { useLang } from '@/i18n/use-lang';
import type { SubmitFormResult } from '@/store/api/requests';
import { MagenDavid } from '@/ui/judaica';
import { Button, Checkbox, Container, Eyebrow, Link, Page, Section, Text, Title } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { PaymentSlot, type PaymentSlotProps } from './slots/payment-slot';
import './styles';
import type { SubmitForm } from './use-submit-form';

/** Calm two-column form page: explanation on the left (top on phones), the form on the right. */
export const FormPage = ({
  title,
  eyebrow,
  heading,
  italic,
  lead,
  aside,
  children,
  className = '',
}: {
  title: string;
  eyebrow: string;
  heading: string;
  italic?: string;
  lead?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <Page title={title} className={`fp ${className}`}>
    <Section tone="cream" pattern>
      <Container>
        <div className="fp__grid">
          <Reveal className="fp__aside">
            <Eyebrow>{eyebrow}</Eyebrow>
            <Title text={heading} italicWord={italic} stroke="reveal" as="h1" size="hero" />
            {lead ? <Text lead>{lead}</Text> : null}
            {aside}
          </Reveal>
          <Reveal className="fp__form" delay={0.12}>
            {children}
          </Reveal>
        </div>
      </Container>
    </Section>
  </Page>
);

/** Banner over the form (network / fields / 429 …) — localized by the hook. */
export const FormBanner = ({ text }: { text?: string }) =>
  text ? (
    <div className="fp__banner" role="alert" data-banner>
      {text}
    </div>
  ) : null;

/** Mandatory personal-data consent. Value key: `consent`. */
export const ConsentField = <V extends { consent: boolean }>({ form }: { form: SubmitForm<V> }) => {
  const { t } = useLang('forms');
  return (
    <div className="fp__consent">
      <Checkbox
        name="consent"
        checked={form.values.consent}
        onChange={form.set('consent') as (v: boolean) => void}
        error={form.error('consent')}
        label={
          <>
            {t('common.consent')} <span className="field__req">*</span>
          </>
        }
      />
      <p className="fp__consent-links">
        <Link href="/privacy">{t('common.privacy')}</Link>
        {' · '}
        <Link href="/consent">{t('common.consentPage')}</Link>
      </p>
    </div>
  );
};

/** Submit button: disabled while sending. */
export const SubmitRow = ({ busy, label }: { busy: boolean; label?: string }) => {
  const { t } = useLang('forms');
  return (
    <div className="fp__submit">
      <Button type="submit" variant="primary" busy={busy} arrow>
        {busy ? t('common.sending') : (label ?? t('common.submit'))}
      </Button>
      <span className="fp__req-note">{t('common.required')}</span>
    </div>
  );
};

/** Short human number of a request: first 8 hex of the uuid. */
export const requestNumber = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase();

/**
 * «Заявка принята» with the request number. `payment` → the <PaymentSlot> below the number
 * (prayers and paid events only).
 */
export const RequestAccepted = ({
  result,
  onAgain,
  payment,
  registered,
}: {
  result: SubmitFormResult;
  onAgain?: () => void;
  payment?: Omit<PaymentSlotProps, 'requestId' | 'registrationId'>;
  /** Event registration wording (seats). */
  registered?: boolean;
}) => {
  const { t } = useLang('forms');
  const isEvent = payment?.purpose === 'event';
  return (
    <div className="accepted" data-accepted>
      <MagenDavid size={40} />
      <Eyebrow>{t('accepted.eyebrow')}</Eyebrow>
      <Title
        text={registered ? t('accepted.registered') : t('accepted.title')}
        italicWord={registered ? t('accepted.registeredItalic') : t('accepted.italic')}
        stroke="reveal"
        as="h2"
        size="lg"
      />
      <Text>
        {registered ? t('accepted.registeredText', { n: result.seats ?? 1 }) : t('accepted.text')}
      </Text>
      <p className="accepted__num">
        {t('accepted.number')}: <strong data-request-number>{requestNumber(result.id)}</strong>
      </p>
      {payment ? (
        <div className="accepted__pay">
          <Text>{isEvent ? t('accepted.paidNote') : t('accepted.prayerNote')}</Text>
          <PaymentSlot
            {...payment}
            requestId={isEvent ? undefined : result.id}
            registrationId={isEvent ? result.id : undefined}
          />
        </div>
      ) : null}
      <div className="accepted__actions">
        {onAgain ? (
          <Button variant="ghost" onPress={onAgain}>
            {t('accepted.again')}
          </Button>
        ) : null}
        <Button variant="primary" href="/" arrow>
          {t('accepted.home')}
        </Button>
      </div>
    </div>
  );
};
