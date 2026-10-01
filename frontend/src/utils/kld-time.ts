/**
 * Даты и время Калининграда — единственный модуль на фронте.
 *
 * Всё считается через `Intl` с `timeZone: 'Europe/Kaliningrad'` (без жёсткого сдвига): «сегодня/сейчас»,
 * форматирование моментов времени (события, новости, админка) и календарных дат 'YYYY-MM-DD'
 * (расписание, праздники — они уже калининградские, поэтому форматируются без сдвига).
 */

export const KLD_TZ = 'Europe/Kaliningrad';

const LOCALES: Record<string, string> = { ru: 'ru-RU', en: 'en-GB', he: 'he-IL' };

/** Язык сайта → локаль Intl (ru по умолчанию). */
export const localeOf = (lang: string): string => LOCALES[lang] ?? 'ru-RU';

const pad = (n: number) => String(n).padStart(2, '0');

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

/** Настенные часы Калининграда в момент `ms`. */
function wall(ms: number) {
  const p: Record<string, string> = {};
  for (const x of wallFmt.formatToParts(new Date(ms))) p[x.type] = x.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
  };
}

/** Дата 'YYYY-MM-DD' и часы 'HH:MM:SS' в Калининграде для момента `nowMs`. */
export function kaliningradNow(nowMs: number): { date: string; time: string } {
  return wall(nowMs);
}

/** Сегодня по Калининграду, 'YYYY-MM-DD'. */
export function kaliningradToday(now: Date | number = Date.now()): string {
  return wall(typeof now === 'number' ? now : now.getTime()).date;
}

/** 'YYYY-MM-DD' + n дней. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Смещение Калининграда от UTC в момент `ms`, '+HH:MM'. */
function offsetAt(ms: number): string {
  const w = wall(ms);
  const asUtc = Date.parse(`${w.date}T${w.time}Z`);
  const min = Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// ── Календарные даты 'YYYY-MM-DD' (уже калининградские) ─────────────────────

/** Григорианская дата 'YYYY-MM-DD' прописью на языке сайта (без сдвига часового пояса). */
export function formatDate(
  date: string,
  lang: string,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
): string {
  return new Intl.DateTimeFormat(localeOf(lang), { ...opts, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

/** Месяц так, как он читается рядом с числом дня («1 октября», а не «октябрь»). */
export function monthOfDay(date: string, lang: string): string {
  const parts = new Intl.DateTimeFormat(localeOf(lang), {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).formatToParts(new Date(`${date}T00:00:00Z`));
  return parts.find((x) => x.type === 'month')?.value ?? formatDate(date, lang, { month: 'long' });
}

/** Названия месяцев 1–12 на языке сайта (именительный падеж). */
export function monthNames(lang: string): string[] {
  const f = new Intl.DateTimeFormat(localeOf(lang), { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, i) => {
    const s = f.format(new Date(Date.UTC(2026, i, 15)));
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}

// ── Моменты времени (ISO) → по Калининграду ─────────────────────────────────

/** Дата по Калининграду: «12 октября 2026». */
export const formatDay = (iso: string, lang: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Intl.DateTimeFormat(localeOf(lang), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: KLD_TZ,
    ...opts,
  }).format(new Date(iso));

/** Время по Калининграду 'HH:MM'. */
export const formatTime = (iso: string, lang: string) =>
  new Intl.DateTimeFormat(localeOf(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: KLD_TZ,
  }).format(new Date(iso));

/** Бейдж даты события: число и короткий месяц. */
export const dateBadge = (iso: string, lang: string) => ({
  day: new Intl.DateTimeFormat(localeOf(lang), { day: 'numeric', timeZone: KLD_TZ }).format(
    new Date(iso)
  ),
  month: new Intl.DateTimeFormat(localeOf(lang), { month: 'short', timeZone: KLD_TZ })
    .format(new Date(iso))
    .replace('.', ''),
});

// ── Админка ─────────────────────────────────────────────────────────────────

/** ISO → 'YYYY-MM-DDTHH:mm' по Калининграду (значение поля datetime-local). */
export const isoToLocal = (iso: unknown): string => {
  if (typeof iso !== 'string' || !iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const w = wall(ms);
  return `${w.date}T${w.time.slice(0, 5)}`;
};

/** 'YYYY-MM-DDTHH:mm' (Калининград) → ISO со смещением Калининграда (`±HH:MM` из Intl). */
export const localToIso = (v: string): string | null => {
  if (!v) return null;
  const full = v.length === 16 ? `${v}:00` : v;
  return `${full}${offsetAt(Date.parse(`${full}Z`))}`;
};

/** Человеческая дата для списков: '14.12.2026 17:00'. */
export const formatLocal = (iso: unknown): string => {
  const v = isoToLocal(iso);
  if (!v) return '';
  const [d, t] = v.split('T');
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y} ${t}`;
};

/** Дата-время ISO → '01.10.2026, 14:05' (по Калининграду). */
export const fmtDateTime = (iso: string | null | undefined): string =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        timeZone: KLD_TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
