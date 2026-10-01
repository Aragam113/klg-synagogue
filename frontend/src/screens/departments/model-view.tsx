import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetDepartmentsQuery } from '@/store/api/content';

import { DepartmentsView } from './view';

/** /departments */
export const DepartmentsScreen = () => {
  const { lang } = useLang('content');
  const q = useGetDepartmentsQuery({ lang });
  return (
    <DepartmentsView
      departments={q.data ?? []}
      loading={q.isLoading}
      error={q.error ? (asApiError(q.error) ?? null) : null}
      onRetry={q.refetch}
    />
  );
};
