import '@/forms/styles';
import { useSubmitForm } from '@/forms/use-submit-form';
import { useLang } from '@/i18n/use-lang';
import { Checkbox, Form, Link } from '@/ui/kit';
import { Button } from '@/ui/kit/button';

interface SubscribeValues {
  name: string;
  email: string;
  livesInCity: boolean;
  consent: boolean;
}

/** One input of the dark footer form with its error under it. */
const Cell = ({
  name,
  type,
  value,
  placeholder,
  autoComplete,
  error,
  onChange,
}: {
  name: string;
  type: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  error?: string;
  onChange: (v: string) => void;
}) => (
  <div className="subscribe__cell">
    <input
      className="subscribe__input"
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      autoComplete={autoComplete}
      aria-invalid={error ? true : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
    {error ? (
      <span className="field__error" role="alert">
        {error}
      </span>
    ) : null}
  </div>
);

/**
 * Footer subscription: name, e-mail, «живу в Калининграде», consent → `POST /subscribe`.
 * The server answers the same for a repeated e-mail, so the form just says «Спасибо».
 */
export const SubscribeForm = () => {
  const { t } = useLang('forms');
  const form = useSubmitForm<SubscribeValues>({
    path: '/subscribe',
    initial: { name: '', email: '', livesInCity: false, consent: false },
  });
  const { values: v, set, error: e } = form;

  if (form.result) {
    return (
      <p className="subscribe__note subscribe__done" role="status" data-subscribed>
        {t('subscribe.done')}
      </p>
    );
  }

  return (
    <Form onSubmit={form.submit} busy={form.busy} className="subscribe">
      <Cell
        name="name"
        type="text"
        autoComplete="name"
        placeholder={t('subscribe.name')}
        value={v.name}
        onChange={set('name')}
        error={e('name')}
      />
      <Cell
        name="email"
        type="email"
        autoComplete="email"
        placeholder={t('subscribe.email')}
        value={v.email}
        onChange={set('email')}
        error={e('email')}
      />
      <div className="subscribe__check">
        <Checkbox
          name="livesInCity"
          label={t('subscribe.lives')}
          checked={v.livesInCity}
          onChange={set('livesInCity')}
        />
        <Checkbox
          name="consent"
          checked={v.consent}
          onChange={set('consent')}
          error={e('consent')}
          label={
            <>
              {t('common.consent')} (<Link href="/consent">{t('common.consentPage')}</Link>)
            </>
          }
        />
      </div>
      {form.banner ? (
        <p className="subscribe__note subscribe__banner" role="alert" data-banner>
          {form.banner}
        </p>
      ) : null}
      <Button type="submit" variant="light" disabled={form.busy}>
        {form.busy ? t('common.sending') : t('subscribe.submit')}
      </Button>
    </Form>
  );
};
