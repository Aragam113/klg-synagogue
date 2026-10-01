import type { SearchHit } from '@/store/api/content';
import type { ApiError } from '@/store/api/http';

import { matchStaticPages } from './static-pages';

export type SearchState = 'idle' | 'short' | 'loading' | 'empty' | 'results';

export interface SearchViewModel {
  state: SearchState;
  /** Нужно ли спрашивать API (q ≥ 2 символов). */
  ask: boolean;
  pages: { path: string; title: string }[];
  hits: SearchHit[];
  total: number;
}

/** Что показать на /search: разделы сайта (свой список) + хиты API (`GET /search`). */
export const searchView = (
  q: string,
  data: { q: string; items: SearchHit[] } | undefined,
  lang: string
): SearchViewModel => {
  const query = q.trim();
  if (!query) return { state: 'idle', ask: false, pages: [], hits: [], total: 0 };
  if (query.length < 2) return { state: 'short', ask: false, pages: [], hits: [], total: 0 };
  const pages = matchStaticPages(query, lang);
  const hits = data?.items ?? [];
  const total = pages.length + hits.length;
  const state: SearchState = !data ? 'loading' : total ? 'results' : 'empty';
  return { state, ask: true, pages, hits, total };
};

export interface SearchViewProps {
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  q: string;
  vm: SearchViewModel;
  fetching: boolean;
  error: ApiError | null;
  onRetry: () => void;
}
