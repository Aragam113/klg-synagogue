import { useEffect, useState } from 'react';

import type { Paged } from '@/store/api/content';

import { accumulate } from './content-model';

/**
 * Номер страницы «Загрузить ещё», сбрасывается на 1 при смене `resetKey` (язык, фильтр)
 * сразу в том же рендере — без лишнего запроса старой страницы на новом языке.
 */
export const usePageCursor = (resetKey: string) => {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const page = state.key === resetKey ? state.page : 1;
  const next = () => setState({ key: resetKey, page: page + 1 });
  return { page, next };
};

/** Склеенная лента из пришедших страниц (см. `accumulate`). */
export const useFeedItems = <T extends { id: string }>(data: Paged<T> | undefined): T[] => {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    if (data) setItems((prev) => accumulate(prev, data));
  }, [data]);
  return items;
};
