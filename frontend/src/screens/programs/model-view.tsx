import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useGetProgramsQuery } from '@/store/api/content';

import { ProgramsView } from './view';

/** /programs */
export const ProgramsScreen = () => {
  const { lang } = useLang('content');
  const q = useGetProgramsQuery({ lang });
  return (
    <ProgramsView
      programs={q.data ?? []}
      loading={q.isLoading}
      error={q.error ? (asApiError(q.error) ?? null) : null}
      onRetry={q.refetch}
    />
  );
};
