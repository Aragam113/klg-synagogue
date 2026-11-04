import type { Day } from '@/store/api/calendar';

/**
 * «Время зажигания свечей» — свой вид виджета Chabad.org (candlelighting.js.asp):
 * ближайшие Шаббаты и праздники, у каждого — строки «зажигание свечей» и «исход».
 * Данные — те же дни GET /calendar/days (времена с Chabad.org, запасной расчёт — hebcal).
 */

export type CandleKind = 'candles' | 'havdalah';

export interface CandleLine {
  date: string;
  weekday: number;
  kind: CandleKind;
  time: string;
  /** «после HH:MM» — от готового огня (второй день праздника, исход Шаббата перед праздником). */
  after: boolean;
  /** Праздник этого дня, если есть. */
  holiday: string | null;
  /** Время — запасной локальный расчёт (hebcal), а не Chabad.org. */
  fallback: boolean;
}

export interface CandleBlock {
  /** Первая дата блока. */
  date: string;
  /** Названия праздников блока (йом-тов); пусто — обычный Шаббат. */
  holidays: string[];
  parasha: string | null;
  lines: CandleLine[];
  /** Хотя бы одно время блока — запасной локальный расчёт. */
  fallback: boolean;
}

const yomTovNames = (d: Day): string[] => d.holidays.filter((h) => h.yomTov).map((h) => h.name);

/**
 * Дни → блоки «свечи … исход»: блок открывают первые свечи, закрывает исход.
 * Свечи внутри праздника («после») и праздник, переходящий в Шаббат, — та же цепочка.
 */
export function candleBlocks(days: readonly Day[], limit = 4): CandleBlock[] {
  const blocks: CandleBlock[] = [];
  let open: CandleBlock | null = null;
  for (const d of days) {
    const lines: CandleLine[] = [];
    if (d.candleLighting)
      lines.push({
        date: d.date,
        weekday: d.weekday,
        kind: 'candles',
        time: d.candleLighting,
        after: !!d.candleAfter,
        holiday: yomTovNames(d)[0] ?? d.holidays[0]?.name ?? null,
        fallback: d.source === 'hebcal',
      });
    if (d.havdalah)
      lines.push({
        date: d.date,
        weekday: d.weekday,
        kind: 'havdalah',
        time: d.havdalah,
        after: false,
        holiday: yomTovNames(d)[0] ?? null,
        fallback: d.source === 'hebcal',
      });
    if (!lines.length) continue;
    // Исход без открытого блока (начали с середины Шаббата) — пропускаем.
    if (!open && lines[0].kind === 'havdalah' && lines.length === 1) continue;
    // Блок длится до исхода: праздник, переходящий в Шаббат, — одна цепочка свечей.
    if (!open) open = { date: d.date, holidays: [], parasha: null, lines: [], fallback: false };
    open.lines.push(...lines);
    for (const n of yomTovNames(d)) if (!open.holidays.includes(n)) open.holidays.push(n);
    if (d.parasha && !open.parasha) open.parasha = d.parasha;
    if (d.source === 'hebcal') open.fallback = true;
    if (lines[lines.length - 1].kind === 'havdalah') {
      blocks.push(open);
      open = null;
    }
    if (blocks.length >= limit) break;
  }
  if (open && blocks.length < limit) blocks.push(open);
  return blocks.slice(0, limit);
}
