import { telHref } from '@/config/site';
import { LEADERS, RECEPTION, nameIn } from '@/forms/facts';
import { ConsentField, FormBanner, FormPage, RequestAccepted, SubmitRow } from '@/forms/ui';
import { type SubmitForm, useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Field, Form, Link, Placeholder, Select } from '@/ui/kit';

interface ContactQuestion {
  name: string;
  phone: string;
  email: string;
  topic: string;
  text: string;
  to?: string;
  consent: boolean;
}

const MARK = '\u0001';

/** Translated sentence with a tel: link in place of {{phone}}. */
const WithPhone = ({ text, phone }: { text: string; phone: string }) => {
  const [before, after] = text.split(MARK);
  return (
    <>
      {before}
      <Link href={telHref(phone)}>{phone}</Link>
      {after}
    </>
  );
};

/** Leaders and offices (sourced, from config/site.ts) + reception hours (not found → placeholder). */
export const ReceptionFacts = () => {
  const { t, lang } = useLang('forms');
  return (
    <ul className="fp__facts">
      <li>{t('appointment.rabbi', { name: nameIn(LEADERS.rabbi, lang) })}</li>
      <li>{t('appointment.chairman', { name: nameIn(LEADERS.chairman, lang) })}</li>
      <li>
        <WithPhone
          text={t('appointment.rabbiReception', { phone: MARK })}
          phone={RECEPTION.rabbiPhone}
        />
      </li>
      <li>
        <WithPhone
          text={t('appointment.synagogueReception', { phone: MARK })}
          phone={RECEPTION.synagoguePhone}
        />
      </li>
      <li>
        <strong>{t('appointment.hours')}:</strong>{' '}
        {RECEPTION.hours ?? <Placeholder>{t('appointment.hoursPlaceholder')}</Placeholder>}
      </li>
    </ul>
  );
};

/** Name*, phone*, e-mail, topic*, text* — shared by the appointment and «ask the rabbi». */
const ContactQuestionFields = ({ form }: { form: SubmitForm<ContactQuestion> }) => {
  const { t } = useLang('forms');
  const { values: v, set, error: e } = form;
  return (
    <>
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
        name="topic"
        label={t('fields.topic')}
        required
        value={v.topic}
        onChangeText={set('topic')}
        error={e('topic')}
      />
      <Field
        name="text"
        multiline
        label={t('fields.text')}
        required
        value={v.text}
        onChangeText={set('text')}
        error={e('text')}
      />
    </>
  );
};

const EMPTY: ContactQuestion = {
  name: '',
  phone: '',
  email: '',
  topic: '',
  text: '',
  consent: false,
};

const ContactQuestionScreen = ({ kind }: { kind: 'appointment' | 'askRabbi' }) => {
  const { t } = useLang('forms');
  const isAppointment = kind === 'appointment';
  const form = useSubmitForm<ContactQuestion>({
    path: isAppointment ? '/requests/appointment' : '/requests/rabbi-question',
    initial: isAppointment ? { ...EMPTY, to: 'rabbi' } : EMPTY,
  });
  return (
    <FormPage
      title={t(`${kind}.title`)}
      eyebrow={t(`${kind}.eyebrow`)}
      heading={t(`${kind}.title`)}
      italic={t(`${kind}.italic`)}
      lead={t(`${kind}.lead`)}
      aside={<ReceptionFacts />}
    >
      {form.result ? (
        <RequestAccepted result={form.result} onAgain={form.reset} />
      ) : (
        <Form onSubmit={form.submit} busy={form.busy}>
          <FormBanner text={form.banner} />
          {isAppointment ? (
            <Select
              name="to"
              label={t('appointment.to')}
              required
              value={form.values.to ?? 'rabbi'}
              onChange={form.set('to')}
              error={form.error('to')}
              options={[
                { value: 'rabbi', label: t('appointment.toRabbi') },
                { value: 'chairman', label: t('appointment.toChairman') },
              ]}
            />
          ) : null}
          <ContactQuestionFields form={form} />
          <ConsentField form={form} />
          <SubmitRow busy={form.busy} />
        </Form>
      )}
    </FormPage>
  );
};

/** /appointment — к раввину или руководителю общины. */
export const AppointmentScreen = () => <ContactQuestionScreen kind="appointment" />;

/** /ask-rabbi — вопрос раввину. */
export const AskRabbiScreen = () => <ContactQuestionScreen kind="askRabbi" />;
