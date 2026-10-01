import { useLang } from '@/i18n/use-lang';
import { Field, Form } from '@/ui/kit';

import { ConsentField, FormBanner, RequestAccepted, SubmitRow } from './ui';
import { useSubmitForm } from './use-submit-form';

interface RegistrationValues {
  name: string;
  phone: string;
  email: string;
  seats: string;
  consent: boolean;
}

export interface EventRegistrationFormProps {
  /** Event slug → `POST /events/:slug/register`. */
  slug: string;
  /** Event id (for the payment slot of a paid event; the server answer wins). */
  eventId?: string;
  /** Paid event → «Заявка принята» shows the payment slot `{purpose:'event', registrationId, eventId, seats}`. */
  isPaid?: boolean;
  /** Today's ticket price — the payment slot shows «seats × price» before checkout. */
  priceRub?: number | null;
}

/**
 * Registration for an event: name, phone, e-mail, seats, consent.
 * After success — «Вы зарегистрированы» with the number; for a paid event — the payment slot below it.
 */
export const EventRegistrationForm = ({
  slug,
  eventId,
  isPaid,
  priceRub,
}: EventRegistrationFormProps) => {
  const { t } = useLang('forms');
  const form = useSubmitForm<RegistrationValues>({
    path: `/events/${slug}/register`,
    initial: { name: '', phone: '', email: '', seats: '1', consent: false },
    toBody: ({ seats, ...rest }) => ({
      ...rest,
      seats: seats.trim() === '' ? '' : Number(seats),
    }),
  });
  const { values: v, set, error: e, result } = form;

  if (result) {
    const paid = result.isPaid ?? isPaid ?? false;
    return (
      <div className="evreg" data-event-registration>
        <RequestAccepted
          result={result}
          registered
          payment={
            paid
              ? {
                  purpose: 'event',
                  eventId: result.eventId ?? eventId,
                  seats: result.seats,
                  priceRub,
                }
              : undefined
          }
          onAgain={form.reset}
        />
      </div>
    );
  }

  return (
    <div className="evreg" data-event-registration>
      <Form onSubmit={form.submit} busy={form.busy}>
        <FormBanner text={form.banner} />
        <Field
          name="name"
          label={t('fields.name')}
          required
          autoComplete="name"
          value={v.name}
          onChangeText={set('name')}
          error={e('name')}
        />
        <div className="fp__row">
          <Field
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label={t('fields.phone')}
            required
            value={v.phone}
            onChangeText={set('phone')}
            error={e('phone')}
          />
          <Field
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            label={t('fields.email')}
            value={v.email}
            onChangeText={set('email')}
            error={e('email')}
          />
        </div>
        <Field
          name="seats"
          type="number"
          inputMode="numeric"
          min="1"
          max="20"
          label={t('fields.seats')}
          required
          value={v.seats}
          onChangeText={set('seats')}
          error={e('seats')}
        />
        <ConsentField form={form} />
        <SubmitRow busy={form.busy} label={t('register.submit')} />
      </Form>
    </div>
  );
};
