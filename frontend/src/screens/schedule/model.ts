import { useEffect, useState } from 'react';

import type { Day } from '@/store/api/calendar';
import type { ApiError } from '@/store/api/http';

/** Чистая логика экрана расписания и виджета «Сегодня» (без React). */

export interface Countdown {
  d: number;
  h: number;
  m: number;
  s: number;
}

/** Сколько осталось до момента `atIso`; null — момент прошёл. */
export function countdown(atIso: string, nowMs: number): Countdown | null {
  const left = Math.floor((Date.parse(atIso) - nowMs) / 1000);
  if (!(left > 0)) return null;
  return {
    d: Math.floor(left / 86400),
    h: Math.floor((left % 86400) / 3600),
    m: Math.floor((left % 3600) / 60),
    s: left % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Ближайшее ещё не наступившее зажигание свечей и сколько до него; null — все в прошлом. */
export function nextCandle<C extends { at: string }>(
  list: readonly C[],
  nowMs: number
): (C & { left: Countdown }) | null {
  for (const c of list) {
    const left = countdown(c.at, nowMs);
    if (left) return { ...c, left };
  }
  return null;
}

/** Отсчёт текстом: '1 д 02 ч 03 мин 04 с' (дни — только если есть), единицы — из i18n `calendar:widget.*`. */
export function countdownText(
  left: Countdown,
  units: { d: string; h: string; m: string; s: string }
): string {
  return [
    left.d ? `${left.d} ${units.d}` : '',
    `${pad(left.h)} ${units.h}`,
    `${pad(left.m)} ${units.m}`,
    `${pad(left.s)} ${units.s}`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Текущее время, тикает раз в `ms` (живые часы и отсчёт) — общий хук главной и виджета «Сегодня». */
export const useNow = (ms = 1000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

/** Весь месяц `month` (1–12) года `year` — для GET /calendar/days?from&to. */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` };
}

export type Service = 'shacharit' | 'mincha' | 'maariv';

/**
 * i18n key of the service label. Friday evening is «Встреча Шаббата» (community wording, source in
 * migration 1790000003000-SeedScheduleTemplate), not a bare «Маарив».
 */
export function serviceLabelKey(service: Service, weekday: number): string {
  return service === 'maariv' && weekday === 5 ? 'col.kabbalatShabbat' : `col.${service}`;
}

export type ScheduleMode = 'list' | 'table';

/** Props of the /schedule view (filled by model-view). */
export interface ScheduleViewProps {
  days: Day[];
  /** 'YYYY-MM-DD' in Kaliningrad — highlighted in gold. */
  today: string;
  loading: boolean;
  error: ApiError | null;
  onRetry: () => void;
  month: string;
  onMonth: (v: string) => void;
  year: string;
  onYear: (v: string) => void;
  monthOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  mode: ScheduleMode;
  onMode: (m: ScheduleMode) => void;
  zmanim: boolean;
  onToggleZmanim: () => void;
}
