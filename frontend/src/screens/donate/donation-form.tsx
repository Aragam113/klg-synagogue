import { type ReactNode } from 'react';

import '@/forms/styles';
import { useLang } from '@/i18n/use-lang';
import { formatRub } from '@/screens/events/content-model';
import { Button, Checkbox, Field, Form, Link } from '@/ui/kit';

import { type PaymentContext, PRESETS } from './donate-model';
import './styles';
import { usePaymentForm } from './use-payment-form';

export interface DonationFormProps {
  ctx: PaymentContext;
  /**
   * Amount fixed by the server (event ticket, Kaddish by tariff): the line shown instead of
   * presets / own amount. Absent → presets + own amount.
   */
  fixed?: ReactNode;
  /** Pre-selected amount (default 1800). */
  initialAmount?: number;
}

/**
 * Payment form: presets 180…18000 ₽ or own amount, once / monthly (donation only),
 * anonymously / in own name, dedication, comment, e-mail*, phone, consent → the checkout.
 */
export const DonationForm = ({ ctx, fixed, initialAmount = 1800 }: DonationFormProps) => {
  const { t, lang } = useLang('payments');
  const { t: tf } = useLang('forms');
  const form = usePaymentForm(ctx, {
    initialAmount: fixed ? '' : String(initialAmount),
    askAmount: !fixed,
  });
  const { values: v, set, error: e } = form;
  const isDonation = ctx.purpose === 'donation';
  const isEvent = ctx.purpose === 'event';

  return (
    <div className="don-form" data-donation-form>
      <Form onSubmit={form.submit} busy={form.busy}>
        {form.banner ? (
          <div className="fp__banner" role="alert" data-banner>
            {form.banner}
          </div>
        ) : null}
        {fixed ? (
          <p className="don-fixed" data-fixed-amount>
            <span>{t('form.toPay')}</span> <strong>{fixed}</strong>
          </p>
        ) : (
          <fieldset className="fp__group don-amount">
            <legend>{t('form.title')}</legend>
            <div className="don-presets" role="radiogroup" aria-label={t('form.presets')}>
              {PRESETS.map((p) => {
                const on = v.amount.replace(/\s/g, '') === String(p);
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`don-chip${on ? ' is-on' : ''}`}
                    onClick={() => set('amount')(String(p))}
                    data-preset={p}
                  >
                    {formatRub(p, lang)}
                  </button>
                );
              })}
            </div>
            <Field
              name="amount"
              inputMode="numeric"
              label={t('form.amount')}
              hint={t('form.amountHint')}
              required
              value={v.amount}
              onChangeText={set('amount')}
              error={e('amount')}
            />
            {isDonation ? (
              <>
                <div className="don-toggle" role="radiogroup">
                  {[false, true].map((monthly) => (
                    <button
                      key={String(monthly)}
                      type="button"
                      role="radio"
                      aria-checked={v.recurring === monthly}
                      className={`don-toggle__btn${v.recurring === monthly ? ' is-on' : ''}`}
                      onClick={() => set('recurring')(monthly)}
                      data-recurring={monthly ? 'monthly' : 'once'}
                    >
                      {monthly ? t('form.monthly') : t('form.once')}
                    </button>
                  ))}
                </div>
                {v.recurring ? <p className="don-note">{t('form.monthlyNote')}</p> : null}
              </>
            ) : null}
          </fieldset>
        )}

        {!isEvent ? (
          <fieldset className="fp__group">
            <legend>{t('form.who')}</legend>
            <div className="don-who" role="radiogroup">
              {[false, true].map((anon) => (
                <label key={String(anon)} className="don-radio">
                  <input
                    type="radio"
                    name="anonymous"
                    checked={v.anonymous === anon}
                    onChange={() => set('anonymous')(anon)}
                    data-anonymous={anon ? 'yes' : 'no'}
                  />
                  <span>{anon ? t('form.anonymous') : t('form.named')}</span>
                </label>
              ))}
            </div>
            {!v.anonymous ? (
              <Field
                name="donorName"
                label={t('form.donorName')}
                required
                autoComplete="name"
                value={v.donorName}
                onChangeText={set('donorName')}
                error={e('donorName')}
              />
            ) : null}
            <Field
              name="dedication"
              multiline
              label={t('form.dedication')}
              hint={t('form.dedicationHint')}
              value={v.dedication}
              onChangeText={set('dedication')}
              error={e('dedication')}
            />
            <Field
              name="comment"
              multiline
              label={t('form.comment')}
              hint={t('form.commentHint')}
              value={v.comment}
              onChangeText={set('comment')}
              error={e('comment')}
            />
          </fieldset>
        ) : null}

        <div className="fp__row">
          <Field
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            label={t('form.email')}
            required
            value={v.email}
            onChangeText={set('email')}
            error={e('email')}
          />
          <Field
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label={t('form.phone')}
            value={v.phone}
            onChangeText={set('phone')}
            error={e('phone')}
          />
        </div>
        <div className="fp__consent">
          <Checkbox
            name="consent"
            checked={v.consent}
            onChange={set('consent')}
            error={e('consent')}
            label={
              <>
                {tf('common.consent')} <span className="field__req">*</span>
              </>
            }
          />
          <p className="fp__consent-links">
            <Link href="/privacy">{tf('common.privacy')}</Link>
            {' · '}
            <Link href="/consent">{tf('common.consentPage')}</Link>
          </p>
        </div>
        {/* Not <SubmitRow> from @/forms: @/forms renders this form through the payment slot (import cycle). */}
        <div className="fp__submit">
          <Button type="submit" variant="primary" disabled={form.busy} arrow>
            {form.busy ? tf('common.sending') : t('form.submit')}
          </Button>
          <span className="fp__req-note">{tf('common.required')}</span>
        </div>
      </Form>
    </div>
  );
};
