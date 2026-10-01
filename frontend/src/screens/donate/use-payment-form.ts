import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { errorMessageKey } from '@/forms/form-model';
import { type Banner, newKey, nextAttempt, outcomeOf } from '@/forms/submit-model';
import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store/api/http';
import { useCreatePaymentMutation } from '@/store/api/payments';
import { useFieldErrorText } from '@/ui/kit';

import {
  type DonationValues,
  type PaymentContext,
  amountError,
  confirmTarget,
  paymentBody,
} from './donate-model';

export interface PaymentForm {
  values: DonationValues;
  set: <K extends keyof DonationValues>(field: K) => (value: DonationValues[K]) => void;
  busy: boolean;
  banner?: string;
  /** Localized error of a form field (`amount`, `email`, `donorName`, `consent`…). */
  error: (field: string) => string | undefined;
  submit: (honeypot: string) => Promise<void>;
}

const EMPTY: DonationValues = {
  amount: '',
  recurring: false,
  anonymous: false,
  donorName: '',
  email: '',
  phone: '',
  comment: '',
  dedication: '',
  consent: false,
};

/** API field → form field (the amount input is called `amount`). */
const formField = (apiField: string) => (apiField === 'amountRub' ? 'amount' : apiField);

/**
 * Payment form (donation / prayer / event ticket): one Idempotency-Key until success,
 * double submit blocked, values kept on any error; success → the checkout (`confirmUrl`).
 * `askAmount=false` — the amount comes from the server (event ticket, Kaddish by tariff).
 */
export function usePaymentForm(
  ctx: PaymentContext,
  { initialAmount = '', askAmount = true }: { initialAmount?: string; askAmount?: boolean } = {}
): PaymentForm {
  const { t } = useLang('forms');
  const fieldErrorText = useFieldErrorText();
  const router = useRouter();
  const [create] = useCreatePaymentMutation();
  const [values, setValues] = useState<DonationValues>({ ...EMPTY, amount: initialAmount });
  const [busy, setBusy] = useState(false);
  const [bannerKind, setBannerKind] = useState<Banner | undefined>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const attempt = useRef<{ key: string; sent: boolean } | null>(null);
  const inFlight = useRef(false);

  const set = useCallback(
    <K extends keyof DonationValues>(field: K) =>
      (value: DonationValues[K]) => {
        setValues((v) => ({ ...v, [field]: value }));
        setFields((f) => {
          if (!(field in f)) return f;
          const next = { ...f };
          delete next[field];
          return next;
        });
      },
    []
  );

  const submit = async (honeypot: string) => {
    if (inFlight.current) return;
    const amountKey = askAmount ? amountError(values.amount) : undefined;
    if (amountKey) {
      setBannerKind('fields');
      setFields({ amount: amountKey });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    const key = nextAttempt(attempt.current, newKey);
    attempt.current = { key, sent: false };
    // Ticket: the buyer's name is already in the registration — the payment itself carries none.
    const body = paymentBody(
      {
        ...values,
        amount: askAmount ? values.amount : '',
        anonymous: ctx.purpose === 'event' || values.anonymous,
      },
      ctx
    );
    try {
      const res = await create({ body: { ...body, website: honeypot }, key });
      if ('error' in res && res.error) {
        const outcome = outcomeOf(asApiError(res.error) ?? { status: 0, message: '' });
        setBannerKind(outcome.banner);
        setFields(
          Object.fromEntries(Object.entries(outcome.fields).map(([k, v]) => [formField(k), v]))
        );
      } else if ('data' in res && res.data) {
        attempt.current = { key, sent: true };
        setBannerKind(undefined);
        setFields({});
        const target = confirmTarget(res.data.confirmUrl);
        if ('internal' in target) router.push(target.internal as never);
        else if (typeof window !== 'undefined') window.location.assign(target.external);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const error = (field: string) => {
    const apiKey = fields[field];
    if (!apiKey) return undefined;
    const { key, params } = errorMessageKey(apiKey);
    return t(`errors.${key}`, { ...params, defaultValue: fieldErrorText(key) ?? key });
  };

  return {
    values,
    set,
    busy,
    banner: bannerKind ? t(`banner.${bannerKind}`) : undefined,
    error,
    submit,
  };
}
