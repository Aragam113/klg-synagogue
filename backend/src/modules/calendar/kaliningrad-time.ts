/**
 * День и время по Калининграду — единственный хелпер бэкенда (календарь, заявки, цены, импорт Telegram).
 * Только `Intl` с часовым поясом синагоги, без жёсткого сдвига.
 */
import { SYNAGOGUE_LOCATION } from './calendar.config';

export const KLD_TZ = SYNAGOGUE_LOCATION.tzid;

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: KLD_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KLD_TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const wallFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: KLD_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** Календарная дата 'YYYY-MM-DD' в Калининграде для момента времени. */
export function kaliningradDate(at: Date = new Date()): string {
  return dateFmt.format(at);
}

/** 'HH:MM' по Калининграду. */
export function kaliningradTime(at: Date): string {
  return timeFmt.format(at);
}

/** Смещение Калининграда от UTC (мс) в момент `ms`. */
function offsetMs(ms: number): number {
  const p: Record<string, string> = {};
  for (const x of wallFmt.formatToParts(new Date(ms))) p[x.type] = x.value;
  const wall = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second
  );
  return wall - Math.floor(ms / 1000) * 1000;
}

/** Начало дня 'YYYY-MM-DD' (00:00 по Калининграду) как момент времени. */
export function kaliningradDayStart(date: string): Date {
  const asUtc = Date.parse(`${date}T00:00:00Z`);
  return new Date(asUtc - offsetMs(asUtc));
}

/** 'YYYY-MM-DD' + n дней. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
