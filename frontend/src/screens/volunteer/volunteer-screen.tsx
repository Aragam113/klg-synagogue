import { ConsentField, FormBanner, FormPage, RequestAccepted, SubmitRow } from '@/forms/ui';
import { useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Checkbox, Field, Form } from '@/ui/kit';

const AREAS = ['meals', 'holidays', 'delivery', 'it', 'other'] as const;

interface VolunteerValues {
  name: string;
  phone: string;
  email: string;
  areas: string[];
  availability: string;
  consent: boolean;
}

/** «Стать волонтёром». */
export const VolunteerScreen = () => {
  const { t } = useLang('forms');
  const form = useSubmitForm<VolunteerValues>({
    path: '/requests/volunteer',
    initial: { name: '', phone: '', email: '', areas: [], availability: '', consent: false },
  });
  const { values: v, set, error: e } = form;
  const toggle = (a: string) => (on: boolean) =>
    set('areas')(on ? [...v.areas, a] : v.areas.filter((x) => x !== a));
  return (
    <FormPage
      title={t('volunteer.title')}
      eyebrow={t('volunteer.eyebrow')}
      heading={t('volunteer.title')}
      italic={t('volunteer.italic')}
      lead={t('volunteer.lead')}
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
          <fieldset className="fp__group">
            <legend>{t('volunteer.areas')}</legend>
            <div className="fp__checks">
              {AREAS.map((a) => (
                <Checkbox
                  key={a}
                  name={`area-${a}`}
                  label={t(`volunteer.areaOpts.${a}`)}
                  checked={v.areas.includes(a)}
                  onChange={toggle(a)}
                />
              ))}
            </div>
            {e('areas') ? <span className="field__error">{e('areas')}</span> : null}
          </fieldset>
          <Field
            name="availability"
            multiline
            label={t('volunteer.availability')}
            value={v.availability}
            onChangeText={set('availability')}
            error={e('availability')}
          />
          <ConsentField form={form} />
          <SubmitRow busy={form.busy} />
        </Form>
      )}
    </FormPage>
  );
};
