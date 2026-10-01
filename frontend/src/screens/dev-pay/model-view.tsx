import { useLocalSearchParams, useRouter } from 'expo-router';

import { asApiError } from '@/store';
import { useFakePaymentMutation, useGetPaymentQuery } from '@/store/api/payments';

import { thanksHref } from './model';
import { DevPayView } from './view';

/** /dev-pay/[id]?token */
export const DevPayScreen = () => {
  const { id, token } = useLocalSearchParams<{ id: string; token: string }>();
  const ref = { id: String(id ?? ''), token: String(token ?? '') };
  const router = useRouter();
  const q = useGetPaymentQuery(ref, {
    skip: !ref.id || !ref.token,
    refetchOnMountOrArgChange: true,
  });
  const [act, a] = useFakePaymentMutation();
  const error = q.error ? (asApiError(q.error) ?? null) : null;
  const notFound = !ref.token || error?.status === 404 || error?.status === 403;
  const href = thanksHref(ref.id, ref.token);
  return (
    <DevPayView
      payment={q.data}
      notFound={notFound}
      error={notFound ? null : error}
      onRetry={q.refetch}
      busy={a.isLoading}
      thanksHref={href}
      onAction={async (action) => {
        const res = await act({ ...ref, action });
        if ('data' in res && res.data) router.replace(href as never);
        else q.refetch();
      }}
    />
  );
};
