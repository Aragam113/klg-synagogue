import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { POLL_INTERVAL_MS, pollStep } from '@/screens/donate/donate-model';
import { asApiError } from '@/store';
import { useCancelRecurringMutation, useGetPaymentQuery } from '@/store/api/payments';

import { ThanksView } from './view';

/** /thanks/[id]?token */
export const ThanksScreen = () => {
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();
  const ref = { id: String(id ?? ''), token: String(token ?? '') };
  const [started] = useState(() => Date.now());
  const [polling, setPolling] = useState(true);
  const q = useGetPaymentQuery(ref, {
    skip: !ref.id || !ref.token,
    pollingInterval: polling ? POLL_INTERVAL_MS : 0,
    refetchOnMountOrArgChange: true,
  });
  const step = q.data ? pollStep(q.data.status, started, Date.now()) : 'wait';
  if (polling && step !== 'wait') setPolling(false);
  const [cancel, c] = useCancelRecurringMutation();
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const notFound = !ref.token || error?.status === 404 || error?.status === 403;

  return (
    <ThanksView
      payment={q.data}
      timedOut={step === 'timeout'}
      notFound={notFound}
      error={notFound ? null : error}
      onRetry={q.refetch}
      canceling={c.isLoading}
      onCancelRecurring={async () => {
        const s = q.data?.subscription;
        if (!s) return;
        await cancel({ id: s.id, token: s.cancelToken });
        q.refetch();
      }}
    />
  );
};
