import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useDirtyGuard } from '@/screens/admin/shared/gate';
import {
  type RequestStatus,
  useAdminPatchRequestMutation,
  useAdminRequestQuery,
  useAdminRequestsQuery,
} from '@/store/api/admin-requests';

import { requestFilters, type RequestFilters } from './model';
import { RequestCardView, RequestsView } from './view';

const LIMIT = 20;

/** /admin/requests?type&status&page — фильтр живёт в адресе. */
export const RequestsScreen = () => {
  const params = useLocalSearchParams<Record<string, string>>();
  const filters = requestFilters(params);
  const q = useAdminRequestsQuery({ ...filters, limit: LIMIT });
  const onFilter = (f: Partial<RequestFilters>) => {
    const next = { ...filters, ...f };
    router.setParams({
      type: next.type || undefined,
      status: next.status || undefined,
      page: next.page > 1 ? String(next.page) : undefined,
    } as never);
  };
  return (
    <RequestsView
      filters={filters}
      onFilter={onFilter}
      items={q.data?.items ?? []}
      total={q.data?.total ?? 0}
      limit={LIMIT}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
    />
  );
};

/** /admin/requests/<id> — карточка: статус и заметка. */
export const RequestCardScreen = ({ id }: { id: string }) => {
  const q = useAdminRequestQuery(id);
  const [patch, st] = useAdminPatchRequestMutation();
  const [status, setStatus] = useState<RequestStatus>('new');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!q.data) return;
    setStatus(q.data.status);
    setNote(q.data.adminNote ?? '');
  }, [q.data]);
  const dirty = !!q.data && (status !== q.data.status || note !== (q.data.adminNote ?? ''));
  useDirtyGuard(dirty);
  const onSave = async () => {
    setSaved(false);
    const res = await patch({ id, status, adminNote: note.trim() || null });
    if (!('error' in res)) setSaved(true);
  };
  return (
    <RequestCardView
      request={q.data}
      loading={q.isLoading}
      error={q.error}
      status={status}
      note={note}
      onStatus={setStatus}
      onNote={setNote}
      onSave={onSave}
      saving={st.isLoading}
      saved={saved}
      dirty={dirty}
      saveError={st.error}
    />
  );
};
