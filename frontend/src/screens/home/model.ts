import { nextCandle, type Countdown } from '@/screens/schedule/model';
import type { TodayInfo } from '@/store/api/calendar';
import { formatDate, kaliningradNow } from '@/utils/kld-time';

export * from './home-model';

/** Live «Today» block of the home page: both dates, Kaliningrad clock, countdown to the next candles. */
export interface TodayBlock {
  gregorian: string;
  hebrew: string;
  /** 'HH:MM:SS' in Kaliningrad. */
  clock: string;
  candles: { date: string; time: string } | null;
  left: Countdown | null;
  parasha: string | null;
}

export const todayBlock = (info: TodayInfo, nowMs: number, lang: string): TodayBlock => {
  const next = nextCandle(info.nextCandles, nowMs);
  return {
    gregorian: formatDate(info.today.date, lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    hebrew: info.today.hebrewDate,
    clock: kaliningradNow(nowMs).time,
    candles: next ? { date: next.date, time: next.time } : null,
    left: next ? next.left : null,
    parasha: info.nextShabbat.parasha ?? info.today.parasha,
  };
};

/**
 * «Ledger» — figures of the synagogue's history. Only facts with a source;
 * the captions are i18n keys `home:ledger.<id>`.
 */
export const LEDGER = [
  // src: OLD-hist, WIKI — освящение 25 августа 1896
  { id: 'consecrated', value: '1896', unit: '' },
  // src: OLD-hist, WIKI, GAKO — высота 46 м
  { id: 'height', value: '46', unit: 'm' },
  // src: OLD-hist, WIKI, RIA — сожжена в ночь с 9 на 10 ноября 1938
  { id: 'burned', value: '1938', unit: '' },
  // src: OLD-n22, WIKI — открытие 8 ноября 2018
  { id: 'reopened', value: '2018', unit: '' },
] as const;

/** «Community life» pinned chapters: texts in `home:community.<id>`, photos from PHOTOS. */
export const COMMUNITY = [
  { id: 'prayer', href: '/schedule', photo: 'facade2019' },
  { id: 'holidays', href: '/schedule', photo: 'evening2024' },
  { id: 'programs', href: '/programs', photo: 'winter2025' },
  { id: 'help', href: '/help', photo: 'orphanage2025' },
] as const;

/** «For visitors» cards: links into the visit section; texts in `home:visit.<id>`. */
export const VISIT = [
  { id: 'hours', href: '/visit/hours', photo: 'facade2019b' },
  { id: 'howTo', href: '/visit/how-to-get', photo: 'eve2018' },
  { id: 'excursions', href: '/visit/excursions', photo: 'interior1896' },
  { id: 'museum', href: '/visit/museum', photo: 'k1900' },
] as const;
