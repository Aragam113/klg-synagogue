import { addDays, kaliningradToday } from '@/utils/kld-time';

/** Pure helpers of the request forms (no React): error keys, dates. */

export interface ErrorMessageKey {
  key: string;
  params: Record<string, number>;
}

/** `seats_left:2` → `{key:'seats_left', params:{n:2}}`; other keys as is. */
export function errorMessageKey(apiKey: string): ErrorMessageKey {
  const m = /^([a-z_]+):(\d+)$/.exec(apiKey);
  if (m) return { key: m[1], params: { n: Number(m[2]) } };
  return { key: apiKey, params: {} };
}

export type YizkorDay = 'yom_kippur' | 'shmini_atzeret' | 'pesach' | 'shavuot';

/** Ключ праздника календарного API (`/calendar/holidays/:key`) → день Изкора. */
export const YIZKOR_HOLIDAYS: Record<string, YizkorDay> = {
  'yom-kippur': 'yom_kippur',
  'shmini-atzeret': 'shmini_atzeret',
  pesach: 'pesach',
  shavuot: 'shavuot',
};

/**
 * Ближайший день Изкора не раньше `from` (YYYY-MM-DD) по ответам календарного API (единый источник дат).
 * Изкор читают в последний день праздника (диаспора: Йом Кипур, Шмини Ацерет, 8-й день Песаха,
 * 2-й день Шавуота) — это последняя дата в `dates`. Нет данных → null.
 */
export function nearestYizkor(
  from: string,
  holidays: { key: string; dates: { date: string }[] }[]
): YizkorDay | null {
  let best: { date: string; day: YizkorDay } | null = null;
  for (const h of holidays) {
    const day = YIZKOR_HOLIDAYS[h.key];
    const last = h.dates[h.dates.length - 1]?.date;
    if (!day || !last || last < from) continue;
    if (!best || last < best.date) best = { date: last, day };
  }
  return best?.day ?? null;
}

/** Ранняя дата экскурсии: сегодня (Калининград) + 3 дня. */
export function minExcursionDate(now: Date): string {
  return addDays(kaliningradToday(now), 3);
}
