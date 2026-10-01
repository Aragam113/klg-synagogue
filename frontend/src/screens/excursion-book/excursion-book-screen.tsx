import { telHref } from '@/config/site';
import { EXCURSION } from '@/forms/facts';
import { minExcursionDate } from '@/forms/form-model';
import { ConsentField, FormBanner, FormPage, RequestAccepted, SubmitRow } from '@/forms/ui';
import { useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Field, Form, Link, Select } from '@/ui/kit';

const KINDS = ['scheduled', 'individual'] as const;
const MARK = '\u0001';

interface ExcursionValues {
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  people: string;
  language: string;
  kind: string;
  comment: string;
  consent: boolean;
}

/** Facts of the tour (source OF-tour), see forms/facts.ts. */
const ExcursionFacts = () => {
  const { t } = useLang('forms');
  const [before, after] = t('excursion.department', { phone: MARK }).split(MARK);
  return (
    <ul className="fp__facts">
      <li>{t('excursion.rule')}</li>
      <li>
        {t('excursion.prices', {
          standard: EXCURSION.priceStandardRub,
          reduced: EXCURSION.priceReducedRub,
        })}
      </li>
      <li>{t('excursion.times', { times: EXCURSION.times.join(', ') })}</li>
      <li>
        {before}
        <Link href={telHref(EXCURSION.departmentPhone)}>{EXCURSION.departmentPhone}</Link>
        {after}
      </li>
    </ul>
  );
};

/** Online tour booking: date ≥ today+3 (Kaliningrad), not on Shabbat/holidays (API checks). */
export const ExcursionBookScreen = () => {
  const { t, lang } = useLang('forms');
  const form = useSubmitForm<ExcursionValues>({
    path: '/requests/excursion',
    initial: {
      name: '',
      phone: '',
      email: '',
      date: '',
      time: '',
      people: '1',
      language: (EXCURSION.languages as readonly string[]).includes(lang) ? lang : 'en',
      kind: 'scheduled',
      comment: '',
      consent: false,
    },
    toBody: (v) => ({ ...v, people: v.people.trim() === '' ? '' : Number(v.people) }),
  });
  const { values: v, set, error: e } = form;
  return (
    <FormPage
      title={t('excursion.title')}
      eyebrow={t('excursion.eyebrow')}
      heading={t('excursion.title')}
      italic={t('excursion.italic')}
      lead={t('excursion.lead')}
      aside={<ExcursionFacts />}
    >
      {form.result ? (
        <RequestAccepted result={form.result} onAgain={form.reset} />
      ) : (
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
          <div className="fp__row">
            <Field
              name="date"
              type="date"
              min={minExcursionDate(new Date())}
              label={t('fields.date')}
              required
              value={v.date}
              onChangeText={set('date')}
              error={e('date')}
            />
            <Select
              name="time"
              label={t('fields.time')}
              value={v.time}
              onChange={set('time')}
              error={e('time')}
              options={[
                { value: '', label: t('excursion.anyTime') },
                ...EXCURSION.times.map((x) => ({ value: x, label: x })),
              ]}
            />
          </div>
          <div className="fp__row">
            <Field
              name="people"
              type="number"
              inputMode="numeric"
              min="1"
              max="50"
              label={t('excursion.people')}
              required
              value={v.people}
              onChangeText={set('people')}
              error={e('people')}
            />
            <Select
              name="language"
              label={t('excursion.language')}
              value={v.language}
              onChange={set('language')}
              error={e('language')}
              options={EXCURSION.languages.map((l) => ({
                value: l,
                label: t(`excursion.langs.${l}`),
              }))}
            />
          </div>
          <Select
            name="kind"
            label={t('excursion.kind')}
            value={v.kind}
            onChange={set('kind')}
            error={e('kind')}
            options={KINDS.map((k) => ({ value: k, label: t(`excursion.kinds.${k}`) }))}
          />
          <Field
            name="comment"
            multiline
            label={t('fields.comment')}
            value={v.comment}
            onChangeText={set('comment')}
            error={e('comment')}
          />
          <ConsentField form={form} />
          <SubmitRow busy={form.busy} />
        </Form>
      )}
    </FormPage>
  );
};
