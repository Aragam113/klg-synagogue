import { useCallback, useRef, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store/api/http';
import { type FormPath, type SubmitFormResult, useSubmitFormMutation } from '@/store/api/requests';
import { useFieldErrorText } from '@/ui/kit';

import { errorMessageKey } from './form-model';
import { type Banner, cleanPayload, newKey, nextAttempt, outcomeOf } from './submit-model';

export interface UseSubmitFormOptions<V extends object> {
  path: FormPath;
  initial: V;
  /** Values → request body (default: the values as they are). Empty strings are dropped anyway. */
  toBody?: (values: V) => Record<string, unknown>;
}

export interface SubmitForm<V extends object> {
  values: V;
  /** `set('email')` → onChange handler; also clears that field's error. */
  set: <K extends keyof V>(field: K) => (value: V[K]) => void;
  /** True while the request is in flight (button disabled, second click ignored). */
  busy: boolean;
  /** Localized banner text over the form, or undefined. */
  banner?: string;
  bannerKind?: Banner;
  /** Localized error of a field (API key → `forms:errors.*`, then `common:fieldErrors.*`). */
  error: (field: string) => string | undefined;
  /** Pass the honeypot value from `<Form onSubmit>`. */
  submit: (honeypot: string) => Promise<void>;
  /** Server answer after success (`{id}`; registration also `{eventId,isPaid,seats}`). */
  result: SubmitFormResult | null;
  /** Back to an empty form (new key). */
  reset: () => void;
}

/**
 * Shared hook of all public forms: blocks double submit, reuses the Idempotency-Key until a send succeeds
 * (a retry after a network error does not create a duplicate), keeps entered values on any error,
 * maps API field keys to texts in the interface language.
 */
export function useSubmitForm<V extends object>({
  path,
  initial,
  toBody,
}: UseSubmitFormOptions<V>): SubmitForm<V> {
  const { t } = useLang('forms');
  const fieldErrorText = useFieldErrorText();
  const [send] = useSubmitFormMutation();
  const [values, setValues] = useState<V>(initial);
  const [busy, setBusy] = useState(false);
  const [bannerKind, setBannerKind] = useState<Banner | undefined>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitFormResult | null>(null);
  const attempt = useRef<{ key: string; sent: boolean } | null>(null);
  const inFlight = useRef(false);

  const set = useCallback(
    <K extends keyof V>(field: K) =>
      (value: V[K]) => {
        setValues((v) => ({ ...v, [field]: value }));
        setFields((f) => {
          if (!(field in f)) return f;
          const next = { ...f };
          delete next[field as string];
          return next;
        });
      },
    []
  );

  const submit = async (honeypot: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const key = nextAttempt(attempt.current, newKey);
    attempt.current = { key, sent: false };
    const body = cleanPayload({
      ...(toBody ? toBody(values) : (values as Record<string, unknown>)),
      website: honeypot,
    });
    try {
      const res = await send({ path, body, key });
      if ('error' in res && res.error) {
        const outcome = outcomeOf(asApiError(res.error) ?? { status: 0, message: '' });
        setBannerKind(outcome.banner);
        setFields(outcome.fields);
      } else if ('data' in res && res.data) {
        attempt.current = { key, sent: true };
        setBannerKind(undefined);
        setFields({});
        setResult(res.data);
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

  const reset = () => {
    setValues(initial);
    setFields({});
    setBannerKind(undefined);
    setResult(null);
    attempt.current = null;
  };

  return {
    values,
    set,
    busy,
    banner: bannerKind ? t(`banner.${bannerKind}`) : undefined,
    bannerKind,
    error,
    submit,
    result,
    reset,
  };
}
