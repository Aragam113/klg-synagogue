import { CsvButton } from '@/screens/admin/shared/ui';
import { useAdminSubscribersQuery, useAdminYahrzeitsQuery } from '@/store/api/admin-requests';

import { SubscribersView, YahrzeitsView } from './view';

export const YahrzeitsScreen = () => {
  const q = useAdminYahrzeitsQuery(30);
  return (
    <YahrzeitsView items={q.data ?? []} loading={q.isLoading} error={q.error} onRetry={q.refetch} />
  );
};

export const SubscribersScreen = () => {
  const q = useAdminSubscribersQuery();
  return (
    <SubscribersView
      items={q.data ?? []}
      loading={q.isLoading}
      error={q.error}
      onRetry={q.refetch}
      csv={<CsvButton path="/admin/subscribers.csv" filename="subscribers.csv" />}
    />
  );
};
