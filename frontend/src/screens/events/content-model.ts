import type { PriceTier } from '@/store/api/content';
import { localeOf } from '@/utils/kld-time';

/** Прогресс сбора: процент 0…100 (целый) и сколько осталось собрать. */
export const fundraiserProgress = ({
  goalRub,
  raisedRub,
}: {
  goalRub: number;
  raisedRub: number;
}) => {
  if (goalRub <= 0) return { percent: 0, leftRub: 0 };
  return {
    percent: Math.min(100, Math.round((raisedRub / goalRub) * 100)),
    leftRub: Math.max(0, goalRub - raisedRub),
  };
};

export type TierState = 'past' | 'current' | 'next';

/**
 * «Лестница цен» для показа: действующая ступень — `priceTierIndex` из API
 * (бэкенд считает её по Калининграду); до неё — прошедшие, после — следующие.
 */
export const ticketLadder = (
  tiers: PriceTier[],
  currentIndex: number | null
): (PriceTier & { state: TierState })[] =>
  tiers.map((t, i) => ({
    ...t,
    state:
      currentIndex === null
        ? 'next'
        : i < currentIndex
          ? 'past'
          : i === currentIndex
            ? 'current'
            : 'next',
  }));

/** Склейка страниц «Загрузить ещё» без дублей. */
export const mergeById = <T extends { id: string }>(prev: T[], next: T[]): T[] => {
  const seen = new Set(prev.map((x) => x.id));
  return [...prev, ...next.filter((x) => !seen.has(x.id))];
};

/** Лента «Загрузить ещё»: первая страница заменяет ленту (смена языка), следующие дописываются. */
export const accumulate = <T extends { id: string }>(
  prev: T[],
  data: { page: number; items: T[] }
): T[] => (data.page <= 1 ? data.items : mergeById(prev, data.items));

/** Текст → куски с ссылками (http/https). */
export const splitLinks = (text: string): { text: string; href?: string }[] => {
  const out: { text: string; href?: string }[] = [];
  const re = /https?:\/\/[^\s)»"]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ text: m[0], href: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
};

export const formatRub = (n: number, lang: string) =>
  `${new Intl.NumberFormat(localeOf(lang)).format(n)} ₽`;

/** Тело новости/события → абзацы. */
export const paragraphs = (body: string | null | undefined) =>
  (body ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
