import { useState } from 'react';

import {
  type AdminPayment,
  useAdminDedicationMutation,
  useAdminPaymentsQuery,
  useAdminRecurringQuery,
} from '@/store/api/admin-payments';

import { PaymentsView } from './view';

const LIMIT = 50;

/** /admin/payments — платежи + подписки; модерация посвящений (PATCH /admin/payments/:id/dedication). */
export const PaymentsScreen = () => {
  const [tab, setTab] = useState<'payments' | 'recurring'>('payments');
  const [filter, setFilter] = useState({ purpose: '', status: '' });
  const [page, setPage] = useState(1);
  const q = useAdminPaymentsQuery({ ...filter, page, limit: LIMIT }, { skip: tab !== 'payments' });
  const rq = useAdminRecurringQuery(undefined, { skip: tab !== 'recurring' });
  const [setDedication, dst] = useAdminDedicationMutation();
  const [pendingId, setPendingId] = useState<string>();
  const active = tab === 'payments' ? q : rq;
  const onDedication = async (p: AdminPayment, visible: boolean) => {
    setPendingId(p.id);
    await setDedication({ id: p.id, visible });
    setPendingId(undefined);
  };
  return (
    <PaymentsView
      tab={tab}
      onTab={setTab}
      purpose={filter.purpose}
      status={filter.status}
      onFilter={(f) => {
        setFilter((s) => ({ ...s, ...f }));
        setPage(1);
      }}
      items={q.data?.items ?? []}
      total={q.data?.total ?? 0}
      page={page}
      limit={LIMIT}
      onPage={setPage}
      recurring={rq.data ?? []}
      loading={active.isLoading}
      error={active.error ?? dst.error}
      onRetry={active.refetch}
      onDedication={onDedication}
      pendingId={pendingId}
    />
  );
};
