import { ConsentField, FormBanner, FormPage, RequestAccepted, SubmitRow } from '@/forms/ui';
import { useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Field, Form, Select } from '@/ui/kit';

const KINDS = ['spiritual', 'medical', 'material', 'question'] as const;
const ROOTS = ['both', 'mother', 'father', 'no'] as const;

interface HelpValues {
  kind: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  address: string;
  roots: string;
  situation: string;
  otherHelp: string;
  question: string;
  consent: boolean;
}

/** «Обратиться за помощью» — the help-request form. */
export const HelpScreen = () => {
  const { t } = useLang('forms');
  const form = useSubmitForm<HelpValues>({
    path: '/requests/help',
    initial: {
      kind: '',
      fullName: '',
      phone: '',
      email: '',
      birthDate: '',
      address: '',
      roots: '',
      situation: '',
      otherHelp: '',
      question: '',
      consent: false,
    },
  });
  const { values: v, set, error: e } = form;
  return (
    <FormPage
      title={t('help.title')}
      eyebrow={t('help.eyebrow')}
      heading={t('help.title')}
      italic={t('help.italic')}
      lead={t('help.lead')}
    >
      {form.result ? (
        <RequestAccepted result={form.result} onAgain={form.reset} />
      ) : (
        <Form onSubmit={form.submit} busy={form.busy}>
          <FormBanner text={form.banner} />
          <Select
            name="kind"
            label={t('help.kind')}
            required
            placeholder={t('common.choose')}
            value={v.kind}
            onChange={set('kind')}
            error={e('kind')}
            options={KINDS.map((k) => ({ value: k, label: t(`help.kinds.${k}`) }))}
          />
          <Field
            name="fullName"
            label={t('fields.fullName')}
            required
            autoComplete="name"
            value={v.fullName}
            onChangeText={set('fullName')}
            error={e('fullName')}
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
              required
              value={v.email}
              onChangeText={set('email')}
              error={e('email')}
            />
          </div>
          <div className="fp__row">
            <Field
              name="birthDate"
              type="date"
              label={t('help.birthDate')}
              required
              value={v.birthDate}
              onChangeText={set('birthDate')}
              error={e('birthDate')}
            />
            <Select
              name="roots"
              label={t('help.roots')}
              placeholder={t('common.choose')}
              value={v.roots}
              onChange={set('roots')}
              error={e('roots')}
              options={ROOTS.map((k) => ({ value: k, label: t(`help.rootsOpts.${k}`) }))}
            />
          </div>
          <Field
            name="address"
            label={t('help.address')}
            required
            autoComplete="street-address"
            value={v.address}
            onChangeText={set('address')}
            error={e('address')}
          />
          <Field
            name="situation"
            multiline
            label={t('help.situation')}
            required
            value={v.situation}
            onChangeText={set('situation')}
            error={e('situation')}
          />
          <Field
            name="otherHelp"
            multiline
            label={t('help.otherHelp')}
            required
            value={v.otherHelp}
            onChangeText={set('otherHelp')}
            error={e('otherHelp')}
          />
          <Field
            name="question"
            multiline
            label={t('help.question')}
            required
            value={v.question}
            onChangeText={set('question')}
            error={e('question')}
          />
          <ConsentField form={form} />
          <SubmitRow busy={form.busy} />
        </Form>
      )}
    </FormPage>
  );
};
