const TZ = 'Europe/Kaliningrad';
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });

/** Сегодняшняя дата в Калининграде, YYYY-MM-DD. */
export function kaliningradToday(now = new Date()): string {
  return dayFmt.format(now);
}

/** YYYY-MM-DD + n дней. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
