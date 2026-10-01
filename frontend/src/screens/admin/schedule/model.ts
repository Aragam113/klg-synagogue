import { fromLoc, type Loc, toLoc } from '@/screens/admin/entity/entity-model';
import type { ScheduleOverride, ScheduleTemplate, ServiceTimes } from '@/store/api/calendar';

/** Недельный шаблон (будни / пятница / Шаббат) + исключения на даты. */
export const SERVICES = ['shacharit', 'mincha', 'maariv'] as const;
export const DAY_KINDS = ['weekday', 'friday', 'shabbat'] as const;
export type Service = (typeof SERVICES)[number];
export type DayKind = (typeof DAY_KINDS)[number];

export type TimesForm = Record<Service, string>;
export type TemplateForm = Record<DayKind, TimesForm>;
export interface OverrideForm extends TimesForm {
  date: string;
  note: Loc;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const timesForm = (t: Partial<ServiceTimes> | undefined): TimesForm => ({
  shacharit: t?.shacharit ?? '',
  mincha: t?.mincha ?? '',
  maariv: t?.maariv ?? '',
});
const timesBody = (t: TimesForm): ServiceTimes => ({
  shacharit: t.shacharit.trim() || null,
  mincha: t.mincha.trim() || null,
  maariv: t.maariv.trim() || null,
});

export const templateForm = (t: ScheduleTemplate | undefined): TemplateForm => ({
  weekday: timesForm(t?.weekday),
  friday: timesForm(t?.friday),
  shabbat: timesForm(t?.shabbat),
});

export const templateBody = (f: TemplateForm): Omit<ScheduleTemplate, 'id'> => ({
  weekday: timesBody(f.weekday),
  friday: timesBody(f.friday),
  shabbat: timesBody(f.shabbat),
});

const timesErrors = (prefix: string, t: TimesForm): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const s of SERVICES) {
    const v = t[s].trim();
    if (v && !HHMM.test(v)) out[prefix ? `${prefix}.${s}` : s] = 'out_of_range';
  }
  return out;
};

export const scheduleErrors = (f: TemplateForm): Record<string, string> =>
  Object.assign({}, ...DAY_KINDS.map((d) => timesErrors(d, f[d])));

export const emptyOverride = (date = ''): OverrideForm => ({
  date,
  shacharit: '',
  mincha: '',
  maariv: '',
  note: { ru: '', en: '', he: '' },
});

export const overrideForm = (o: ScheduleOverride): OverrideForm => ({
  date: o.date,
  ...timesForm(o),
  note: toLoc(o.note),
});

export const overrideErrors = (f: OverrideForm): Record<string, string> => {
  const out = timesErrors('', f);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) out.date = 'required';
  return out;
};

export const overrideBody = (f: OverrideForm): ScheduleOverride => ({
  date: f.date,
  ...timesBody(f),
  note: fromLoc(f.note),
});

/** Бэк отдаёт исключения за ≤ 62 дня (`range_too_long`), поэтому экран листает окнами. */
export const WINDOW_DAYS = 62;
const DAY_MS = 86400_000;
const dayNum = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY_MS);
const fromDayNum = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** Окно `page` (0 — с сегодняшнего дня, 1 — следующие 62 дня, −1 — предыдущие). */
export const overrideWindow = (today: string, page: number): { from: string; to: string } => {
  const start = dayNum(today) + page * WINDOW_DAYS;
  return { from: fromDayNum(start), to: fromDayNum(start + WINDOW_DAYS - 1) };
};

/** Номер окна, в котором видна дата `date`. */
export const windowPageOf = (today: string, date: string): number =>
  Math.floor((dayNum(date) - dayNum(today)) / WINDOW_DAYS);
