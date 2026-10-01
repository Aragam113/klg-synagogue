import { emptyApi } from '@/store/empty-api';

/** Время службы 'HH:MM' или null — службы нет. */
export interface ServiceTimes {
  shacharit: string | null;
  mincha: string | null;
  maariv: string | null;
}

export interface DayHoliday {
  key: string;
  name: string;
  /** Есть страница /holidays/[key] */
  link: boolean;
  yomTov: boolean;
}

export interface Zmanim {
  /** null — рассвет (алот) не наступает: белые ночи лета */
  alot: string | null;
  talit: string;
  sunrise: string;
  shma: string;
  tfila: string;
  chatzot: string;
  shkia: string;
  tzet: string;
}

/** День расписания (GET /calendar/days). Времена — 'HH:MM' по Калининграду. */
export interface Day {
  date: string;
  hebrewDate: string;
  /** 0 = вс … 6 = сб */
  weekday: number;
  services: ServiceTimes | null;
  candleLighting: string | null;
  havdalah: string | null;
  parasha: string | null;
  holidays: DayHoliday[];
  zmanim: Zmanim;
  note: string | null;
  closed: boolean;
}

export interface Moment {
  date: string;
  time: string;
  /** ISO (UTC) — для обратного отсчёта */
  at: string;
}

export interface TodayInfo {
  today: Day;
  nextCandles: Moment[];
  nextShabbat: { candles: Moment | null; havdalah: Moment | null; parasha: string | null };
}

export interface HolidayPage {
  key: string;
  title: string;
  text: string;
  year: number;
  dates: { date: string; name: string }[];
}

export interface ScheduleTemplate {
  id: number;
  weekday: ServiceTimes;
  friday: ServiceTimes;
  shabbat: ServiceTimes;
}

export interface ScheduleOverride extends ServiceTimes {
  date: string;
  note: { ru: string; en?: string; he?: string } | null;
}

export const calendarApi = emptyApi
  .enhanceEndpoints({ addTagTypes: ['Schedule'] })
  .injectEndpoints({
    endpoints: (b) => ({
      getDays: b.query<Day[], { from?: string; to?: string } | void>({
        query: (r) => ({ url: '/calendar/days', params: r ?? {} }),
        providesTags: ['Schedule'],
      }),
      getToday: b.query<TodayInfo, void>({
        query: () => '/calendar/today',
        providesTags: ['Schedule'],
      }),
      getHoliday: b.query<HolidayPage, { key: string; year?: number }>({
        query: ({ key, year }) => ({
          url: `/calendar/holidays/${encodeURIComponent(key)}`,
          params: year ? { year } : {},
        }),
      }),
      // админка (экран /admin/schedule)
      getScheduleTemplate: b.query<ScheduleTemplate, void>({
        query: () => '/admin/schedule/template',
        providesTags: ['Schedule'],
      }),
      putScheduleTemplate: b.mutation<ScheduleTemplate, Omit<ScheduleTemplate, 'id'>>({
        query: (body) => ({ url: '/admin/schedule/template', method: 'PUT', body }),
        invalidatesTags: ['Schedule'],
      }),
      getScheduleOverrides: b.query<ScheduleOverride[], { from?: string; to?: string } | void>({
        query: (r) => ({ url: '/admin/schedule/overrides', params: r ?? {} }),
        providesTags: ['Schedule'],
      }),
      putScheduleOverride: b.mutation<ScheduleOverride, ScheduleOverride>({
        query: ({ date, ...body }) => ({
          url: `/admin/schedule/overrides/${date}`,
          method: 'PUT',
          body,
        }),
        invalidatesTags: ['Schedule'],
      }),
      deleteScheduleOverride: b.mutation<{ date: string }, string>({
        query: (date) => ({ url: `/admin/schedule/overrides/${date}`, method: 'DELETE' }),
        invalidatesTags: ['Schedule'],
      }),
    }),
  });

export const {
  useGetDaysQuery,
  useGetTodayQuery,
  useGetHolidayQuery,
  useGetScheduleTemplateQuery,
  usePutScheduleTemplateMutation,
  useGetScheduleOverridesQuery,
  usePutScheduleOverrideMutation,
  useDeleteScheduleOverrideMutation,
} = calendarApi;
