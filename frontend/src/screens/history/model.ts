import type { SectionsContent } from '@/content';

type Chapter = SectionsContent['history']['chapters'][number];

/**
 * Раскладка главы — чтобы рядом с коротким текстом не висел столбик больших фото:
 * - `solo` — без фото и цитаты: абзацы в две колонки на всю ширину;
 * - `quote` — без фото: цитата крупно в боковой колонке;
 * - `fill` — одно фото: кадр по высоте текста (object-fit: cover);
 * - `pair` — два фото: пара арок рядом в боковой колонке (sticky, если текст длиннее);
 * - `strip` — три и больше: текст с цитатой сбоку, под ним лента широких кадров на всю ширину.
 */
export type ChapterLayout = 'solo' | 'quote' | 'fill' | 'pair' | 'strip';

export const chapterLayout = (ch: {
  photos: readonly unknown[];
  quote?: unknown;
}): ChapterLayout => {
  const n = ch.photos.length;
  if (n === 0) return ch.quote ? 'quote' : 'solo';
  if (n === 1) return 'fill';
  if (n === 2) return 'pair';
  return 'strip';
};

/** Раскладки с боковой колонкой — у них стороны текст/медиа чередуются. */
const SIDE: ReadonlySet<ChapterLayout> = new Set(['quote', 'fill', 'pair']);

export interface HistoryChapter extends Chapter {
  layout: ChapterLayout;
  /** Боковая колонка слева от текста (на десктопе; на телефоне всё в одну колонку). */
  flip: boolean;
}

/** /history — главы, оглавление-якоря, таймлайн. */
export interface HistoryViewProps {
  content: SectionsContent['history'];
  chapters: HistoryChapter[];
  /** Пункты оглавления: якорь глав + «Хронология». */
  toc: { href: string; year?: string; title: string }[];
}

/** Тон главы по кругу: светлая, тёмная, чернильная — тёмные с гексаграммами. */
export const chapterTone = (i: number) => (['cream', 'deep', 'ink'] as const)[i % 3];

/** Цитата сбоку (`quote`) не флипается: она всегда справа от текста, иначе читается раньше него. */
const flippable = (l: ChapterLayout) => l === 'fill' || l === 'pair';

export const historyModel = (c: SectionsContent, timelineLabel: string): HistoryViewProps => {
  let side = 0;
  const chapters = c.history.chapters.map((ch) => {
    const layout = chapterLayout(ch);
    const flip = SIDE.has(layout) ? side++ % 2 === 1 && flippable(layout) : false;
    return { ...ch, layout, flip };
  });
  return {
    content: c.history,
    chapters,
    toc: [
      ...c.history.chapters.map((ch) => ({ href: `#${ch.id}`, year: ch.year, title: ch.title })),
      { href: '#timeline', title: timelineLabel },
    ],
  };
};
