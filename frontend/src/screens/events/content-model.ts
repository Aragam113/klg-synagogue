import type { PriceTier } from '@/store/api/content';

const TZ = 'Europe/Kaliningrad';

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

const locale = (lang: string) => (lang === 'he' ? 'he-IL' : lang === 'en' ? 'en-GB' : 'ru-RU');

/** Дата по Калининграду: «12 октября 2026». */
export const formatDay = (iso: string, lang: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ,
    ...opts,
  }).format(new Date(iso));

/** Время по Калининграду 'HH:MM'. */
export const formatTime = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(locale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso));

/** Бейдж даты события: число и короткий месяц. */
export const dateBadge = (iso: string, lang: string) => ({
  day: new Intl.DateTimeFormat(locale(lang), { day: 'numeric', timeZone: TZ }).format(
    new Date(iso)
  ),
  month: new Intl.DateTimeFormat(locale(lang), { month: 'short', timeZone: TZ })
    .format(new Date(iso))
    .replace('.', ''),
});

export const formatRub = (n: number, lang: string) =>
  `${new Intl.NumberFormat(locale(lang)).format(n)} ₽`;

/** Тело новости/события → абзацы. */
export const paragraphs = (body: string | null | undefined) =>
  (body ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
