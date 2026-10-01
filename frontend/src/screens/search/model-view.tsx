import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { asApiError } from '@/store';
import { useSearchQuery } from '@/store/api/content';

import { searchView } from './model';
import { SearchView } from './view';

/** /search?q= — запрос живёт в адресе (иконка поиска в шапке ведёт сюда). */
export const SearchScreen = () => {
  const params = useLocalSearchParams<{ q?: string }>();
  const q = String(params.q ?? '');
  const { lang } = useLang('content');
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const pre = searchView(q, undefined, lang);
  const res = useSearchQuery({ lang, q: q.trim() }, { skip: !pre.ask });
  const vm = searchView(q, pre.ask ? res.currentData : undefined, lang);
  const error = pre.ask && res.error ? (asApiError(res.error) ?? null) : null;

  return (
    <SearchView
      draft={draft}
      onDraft={setDraft}
      onSubmit={() => router.setParams({ q: draft.trim() })}
      q={q}
      vm={error ? { ...vm, state: vm.pages.length ? 'results' : 'empty' } : vm}
      fetching={res.isFetching}
      error={error}
      onRetry={res.refetch}
    />
  );
};
