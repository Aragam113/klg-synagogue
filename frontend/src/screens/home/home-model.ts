import type { SectionsContent } from '@/content';

/**
 * Pure model of the home page: what goes into the scroll scene and the live sections, and how
 * API answers (loading / error / empty) turn into what a section shows. The view only renders this.
 */

type History = SectionsContent['history'];

export interface SceneChapter {
  id: string;
  /** Big label: year or «Сегодня». */
  label: string;
  title: string;
  italic: string;
  text: string;
}

/** Chapters of the scene, in order; ids of `getContent(lang).history.chapters` (sourced texts). */
export const SCENE_CHAPTERS = ['koenigsberg', 'kristallnacht', 'opening', 'today'] as const;

/** The year a chapter is known by: last 4-digit year of its label ('1894–1896' → '1896'). */
const yearOf = (year: string): string => year.match(/\d{4}/g)?.pop() ?? year;

export const sceneChapters = (
  history: History,
  todayLabel: string,
  todayTitle?: { title: string; italic: string }
): SceneChapter[] =>
  SCENE_CHAPTERS.flatMap((id) => {
    const c = history.chapters.find((x) => x.id === id);
    if (!c) return [];
    return [
      {
        id,
        label: id === 'today' ? todayLabel : yearOf(c.year),
        title: id === 'today' && todayTitle ? todayTitle.title : c.title,
        italic: id === 'today' && todayTitle ? todayTitle.italic : c.italic,
        text: c.paragraphs[0] ?? '',
      },
    ];
  });

export type BlockState = 'loading' | 'ready' | 'empty' | 'hidden';

/** loading → skeleton; error → the section's own choice (meaningful empty state or not shown at all). */
export const blockState = (
  q: { isLoading: boolean; isError: boolean; items: readonly unknown[] | undefined },
  onFail: 'empty' | 'hidden'
): BlockState => {
  if (q.isLoading) return 'loading';
  if (q.isError || !q.items?.length) return onFail;
  return 'ready';
};
