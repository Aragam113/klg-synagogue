import type { SectionsContent } from '@/content';

/** /history — главы, оглавление-якоря, таймлайн. */
export interface HistoryViewProps {
  content: SectionsContent['history'];
  /** Пункты оглавления: якорь глав + «Хронология». */
  toc: { href: string; year?: string; title: string }[];
}

/** Тон главы по кругу: светлая, тёмная, чернильная — тёмные с гексаграммами. */
export const chapterTone = (i: number) => (['cream', 'deep', 'ink'] as const)[i % 3];

export const historyModel = (c: SectionsContent, timelineLabel: string): HistoryViewProps => ({
  content: c.history,
  toc: [
    ...c.history.chapters.map((ch) => ({ href: `#${ch.id}`, year: ch.year, title: ch.title })),
    { href: '#timeline', title: timelineLabel },
  ],
});
