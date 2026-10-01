import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import {
  Event as HEvent,
  HDate,
  HebrewCalendar,
  Location,
  ParshaEvent,
  Zmanim,
  flags,
} from '@hebcal/core';
import { LangCode, localize } from '@common/localization';
import {
  ScheduleOverrideEntity,
  ScheduleTemplateEntity,
  ServiceTimes,
} from './entities';
import {
  CANDLE_LIGHTING_MINUTES,
  DEFAULT_RANGE_DAYS,
  HAVDALAH_DEGREES,
  HAVDALAH_FALLBACK_MINUTES,
  MAX_RANGE_DAYS,
  SYNAGOGUE_LOCATION,
} from './calendar.config';
import {
  HOLIDAY_INFO,
  MONTHS_RU,
  PARSHIOT_RU,
  holidayKey,
  holidayNameRu,
} from './hebrew-names';
import { kaliningradDate, kaliningradTime as hhmm } from './kaliningrad-time';

export interface DayHoliday {
  /** Ключ страницы /holidays/:key */
  key: string;
  name: string;
  /** Есть ли страница праздника. */
  link: boolean;
  /** Йом-тов (работа запрещена). */
  yomTov: boolean;
}

/** 'HH:MM' по Калининграду; null — в этот день зман не наступает (белые ночи). */
export interface Zmanim8 {
  alot: string | null;
  talit: string | null;
  sunrise: string | null;
  shma: string | null;
  tfila: string | null;
  chatzot: string | null;
  shkia: string | null;
  tzet: string | null;
}

export interface Day {
  /** YYYY-MM-DD */
  date: string;
  /** «3 кислева 5787» / «3 Kislev 5787» / «ג׳ כסלו תשפ״ז» */
  hebrewDate: string;
  /** 0 = воскресенье … 6 = суббота */
  weekday: number;
  /** null — время молитв не задано (шаблон пуст / отмена). */
  services: ServiceTimes | null;
  /** 'HH:MM' по Калининграду */
  candleLighting: string | null;
  havdalah: string | null;
  parasha: string | null;
  holidays: DayHoliday[];
  zmanim: Zmanim8;
  note: string | null;
  /** Шаббат или йом-тов — синагога закрыта для экскурсий. */
  closed: boolean;
}

export interface Moment {
  date: string;
  time: string;
  /** ISO-время (UTC) для обратного отсчёта на фронте. */
  at: string;
}

export interface TodayInfo {
  today: Day;
  nextCandles: Moment[];
  nextShabbat: {
    candles: Moment | null;
    havdalah: Moment | null;
    parasha: string | null;
  };
}

export interface HolidayPage {
  key: string;
  title: string;
  text: string;
  year: number;
  dates: { date: string; name: string }[];
}

interface RawDay {
  day: Day;
  candleAt: Date | null;
  havdalahAt: Date | null;
}

const EMPTY: ServiceTimes = { shacharit: null, mincha: null, maariv: null };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const location = new Location(
  SYNAGOGUE_LOCATION.latitude,
  SYNAGOGUE_LOCATION.longitude,
  false,
  SYNAGOGUE_LOCATION.tzid,
  SYNAGOGUE_LOCATION.name,
  SYNAGOGUE_LOCATION.countryCode
);

/** 'YYYY-MM-DD' → Date с теми же локальными полями (так hebcal читает дни). */
function toLocal(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fromLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(date: string, n: number): string {
  const d = toLocal(date);
  d.setDate(d.getDate() + n);
  return fromLocal(d);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.UTC(...ymd(to)) - Date.UTC(...ymd(from))) / DAY_MS);
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m - 1, d];
}

function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string' || !DATE_RE.test(date)) return false;
  return fromLocal(toLocal(date)) === date;
}

function hebrewDate(hd: HDate, lang: LangCode): string {
  if (lang === 'he') return hd.renderGematriya(true);
  const month = hd.getMonthName();
  const name = lang === 'ru' ? (MONTHS_RU[month] ?? month) : month;
  return `${hd.getDate()} ${name} ${hd.getFullYear()}`;
}

function parashaName(ev: ParshaEvent, lang: LangCode): string {
  if (lang === 'he') return ev.render('he-x-NoNikud').replace(/^פרשת\s+/, '');
  if (lang === 'ru') return ev.parsha.map((p) => PARSHIOT_RU[p] ?? p).join('–');
  return ev.parsha.join('-');
}

function holidayName(ev: HEvent, lang: LangCode): string {
  if (lang === 'he') return ev.render('he-x-NoNikud');
  if (lang === 'ru') return holidayNameRu(ev.getDesc());
  return ev.render('en');
}

function isYomTov(ev: HEvent): boolean {
  const f = ev.getFlags();
  return (f & flags.CHAG) !== 0 && (f & flags.EREV) === 0;
}

function hebcalEvents(from: string, to: string): HEvent[] {
  return HebrewCalendar.calendar({
    start: toLocal(from),
    end: toLocal(to),
    location,
    candlelighting: true,
    candleLightingMins: CANDLE_LIGHTING_MINUTES,
    havdalahDeg: HAVDALAH_DEGREES,
    sedrot: true,
    il: false,
    noModern: true,
  });
}

/** Праздник дня: событие без времени или ханукальная свеча (у неё есть время — сумерки). */
function isHolidayEvent(ev: HEvent): boolean {
  return !eventTime(ev) || (ev.getFlags() & flags.CHANUKAH_CANDLES) !== 0;
}

function eventTime(ev: HEvent): Date | null {
  const t = (ev as HEvent & { eventTime?: Date }).eventTime;
  return t instanceof Date ? t : null;
}

function validDate(d: Date | null | undefined): Date | null {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

/** 'HH:MM' или null, если hebcal вернул Invalid Date (солнце не дошло до угла). */
function hhmmOrNull(d: Date | null | undefined): string | null {
  const v = validDate(d);
  return v ? hhmm(v) : null;
}

/**
 * Выход звёзд для исхода Шаббата/праздника: солнце на HAVDALAH_DEGREES,
 * а если в эту ночь угол не достигается — закат + HAVDALAH_FALLBACK_MINUTES
 * (обоснование в calendar.config.ts). null — нет и заката (полярный день).
 */
export function nightfall(z: Zmanim): Date | null {
  const tzeit = validDate(z.tzeit(HAVDALAH_DEGREES));
  if (tzeit) return tzeit;
  const sunset = validDate(z.shkiah());
  return sunset
    ? new Date(sunset.getTime() + HAVDALAH_FALLBACK_MINUTES * 60_000)
    : null;
}

function moment(at: Date | null): Moment | null {
  if (!at) return null;
  return { date: kaliningradDate(at), time: hhmm(at), at: at.toISOString() };
}

/** 400 по контракту 01: человеческое сообщение + машинный ключ поля. */
export function dateError(
  field: string,
  key: 'invalid_date' | 'invalid_range' | 'range_too_long'
): BadRequestException {
  return new BadRequestException({
    message: 'Проверьте даты',
    fields: { [field]: key },
  });
}

/** Дата 'YYYY-MM-DD' из параметра пути; иначе 400 `{date: 'invalid_date'}`. */
export function parseDateParam(date: string, field = 'date'): string {
  if (!isValidDate(date)) throw dateError(field, 'invalid_date');
  return date;
}

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(ScheduleTemplateEntity)
    private readonly templates: Repository<ScheduleTemplateEntity>,
    @InjectRepository(ScheduleOverrideEntity)
    private readonly overrides: Repository<ScheduleOverrideEntity>
  ) {}

  /** Диапазон по умолчанию — 14 дней от сегодня; > 62 дней или кривые даты → 400 с `fields`. */
  resolveRange(from?: string, to?: string, now = new Date()): [string, string] {
    const start = from ?? kaliningradDate(now);
    if (!isValidDate(start)) throw dateError('from', 'invalid_date');
    const end = to ?? addDays(start, DEFAULT_RANGE_DAYS - 1);
    if (!isValidDate(end)) throw dateError('to', 'invalid_date');
    const span = daysBetween(start, end);
    if (span < 0) throw dateError('to', 'invalid_range');
    if (span + 1 > MAX_RANGE_DAYS) throw dateError('to', 'range_too_long');
    return [start, end];
  }

  async getDays(from: string, to: string, lang: LangCode): Promise<Day[]> {
    return (await this.rawDays(from, to, lang)).map((r) => r.day);
  }

  async getToday(lang: LangCode, now = new Date()): Promise<TodayInfo> {
    const today = kaliningradDate(now);
    const raw = await this.rawDays(
      addDays(today, -1),
      addDays(today, 15),
      lang
    );
    const nextCandles = raw
      .filter((r) => r.candleAt && r.candleAt > now)
      .slice(0, 2)
      .map((r) => moment(r.candleAt) as Moment);
    const satIdx = raw.findIndex(
      (r) => r.day.date >= today && r.day.weekday === 6
    );
    const sat = raw[satIdx];
    const fri = raw[satIdx - 1];
    return {
      today: raw.find((r) => r.day.date === today)!.day,
      nextCandles,
      nextShabbat: {
        candles: moment(fri?.candleAt ?? null),
        havdalah: moment(sat.havdalahAt),
        parasha: sat.day.parasha,
      },
    };
  }

  /** Шаббат или йом-тов (диаспора) — синагога закрыта для экскурсий. */
  isClosedForVisits(date: string | Date): boolean {
    const d = typeof date === 'string' ? date : kaliningradDate(date);
    if (toLocal(d).getDay() === 6) return true;
    return hebcalEvents(d, d).some(isYomTov);
  }

  /**
   * Дата годовщины смерти (йорцайт) по еврейскому календарю в указанном григорианском году.
   * deathDate — дневная дата смерти (YYYY-MM-DD); null, если в этом году годовщины нет.
   */
  hebrewAnniversary(deathDate: string, gregorianYear: number): string | null {
    const death = toLocal(deathDate);
    const hits: string[] = [];
    for (const hy of [gregorianYear + 3760, gregorianYear + 3761]) {
      const hd = HebrewCalendar.getYahrzeit(hy, death);
      if (!hd) continue;
      const g = hd.greg();
      if (g.getFullYear() === gregorianYear) hits.push(fromLocal(g));
    }
    return hits.sort()[0] ?? null;
  }

  /** Страница праздника: описание и даты в григорианском году. */
  getHoliday(key: string, lang: LangCode, year: number): HolidayPage {
    const info = HOLIDAY_INFO[key];
    if (!info) throw new NotFoundException('Праздник не найден');
    const dates = hebcalEvents(`${year}-01-01`, `${year}-12-31`)
      .filter(
        (ev) =>
          ev.getFlags() &
            (flags.CHAG |
              flags.MINOR_HOLIDAY |
              flags.MAJOR_FAST |
              flags.CHOL_HAMOED |
              flags.CHANUKAH_CANDLES |
              flags.EREV) &&
          isHolidayEvent(ev) &&
          holidayKey(ev.basename()) === key
      )
      .map((ev) => ({
        date: fromLocal(ev.getDate().greg()),
        name: holidayName(ev, lang),
      }));
    return { key, title: info.title[lang], text: info.text[lang], year, dates };
  }

  // --- шаблон и исключения (админка) ---

  async getTemplate(): Promise<ScheduleTemplateEntity> {
    return (
      (await this.templates.findOneBy({ id: 1 })) ?? {
        id: 1,
        weekday: EMPTY,
        friday: EMPTY,
        shabbat: EMPTY,
      }
    );
  }

  async putTemplate(
    t: Omit<ScheduleTemplateEntity, 'id'>
  ): Promise<ScheduleTemplateEntity> {
    const row = {
      id: 1,
      weekday: t.weekday,
      friday: t.friday,
      shabbat: t.shabbat,
    };
    await this.templates.save(row);
    return row;
  }

  listOverrides(from: string, to: string): Promise<ScheduleOverrideEntity[]> {
    return this.overrides.find({
      where: { date: Between(from, to) },
      order: { date: 'ASC' },
    });
  }

  async getOverride(date: string): Promise<ScheduleOverrideEntity> {
    const row = await this.overrides.findOneBy({ date });
    if (!row) throw new NotFoundException('Исключения на эту дату нет');
    return row;
  }

  async putOverride(
    row: ScheduleOverrideEntity
  ): Promise<ScheduleOverrideEntity> {
    await this.overrides.save(row);
    return row;
  }

  async deleteOverride(date: string): Promise<void> {
    const res = await this.overrides.delete({ date });
    if (!res.affected)
      throw new NotFoundException('Исключения на эту дату нет');
  }

  // --- вычисление дней ---

  private async rawDays(
    from: string,
    to: string,
    lang: LangCode
  ): Promise<RawDay[]> {
    const template = await this.getTemplate();
    const overrides = new Map(
      (await this.listOverrides(from, to)).map((o) => [o.date, o] as const)
    );
    const byDate = new Map<string, HEvent[]>();
    // +1 день: нужен, чтобы понять, кончается ли сегодня Шаббат/праздник.
    for (const ev of hebcalEvents(from, addDays(to, 1))) {
      const key = fromLocal(ev.getDate().greg());
      byDate.set(key, [...(byDate.get(key) ?? []), ev]);
    }

    const out: RawDay[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const local = toLocal(date);
      const weekday = local.getDay();
      const events = byDate.get(date) ?? [];
      let candleAt: Date | null = null;
      let havdalahAt: Date | null = null;
      let parasha: string | null = null;
      const holidays: DayHoliday[] = [];
      for (const ev of events) {
        const desc = ev.getDesc();
        if (desc === 'Candle lighting') candleAt = eventTime(ev);
        else if (desc === 'Havdalah') havdalahAt = eventTime(ev);
        else if (ev instanceof ParshaEvent) parasha = parashaName(ev, lang);
        else if (isHolidayEvent(ev)) {
          const key = holidayKey(ev.basename());
          holidays.push({
            key,
            name: holidayName(ev, lang),
            link: key in HOLIDAY_INFO,
            yomTov: isYomTov(ev),
          });
        }
      }

      const override = overrides.get(date);
      const base = override
        ? {
            shacharit: override.shacharit,
            mincha: override.mincha,
            maariv: override.maariv,
          }
        : weekday === 6
          ? template.shabbat
          : weekday === 5
            ? template.friday
            : template.weekday;
      const services =
        base && (base.shacharit || base.mincha || base.maariv)
          ? { ...EMPTY, ...base }
          : null;
      const overrideNote = override?.note
        ? localize(override.note, lang).value
        : null;
      const autoNote = holidays.length
        ? holidays.map((h) => h.name).join(', ')
        : parasha;

      const z = new Zmanim(location, local, false);
      const closed = weekday === 6 || holidays.some((h) => h.yomTov);
      // hebcal молча выкидывает события «на выход звёзд», если солнце не дошло
      // до угла: исход (и свечи на исходе Шаббата перед йом-товом) — по nightfall.
      if (closed && !havdalahAt && !candleAt) {
        const next = addDays(date, 1);
        const nextClosed =
          toLocal(next).getDay() === 6 ||
          (byDate.get(next) ?? []).some(isYomTov);
        if (nextClosed) candleAt = nightfall(z);
        else havdalahAt = nightfall(z);
      }
      out.push({
        candleAt,
        havdalahAt,
        day: {
          date,
          hebrewDate: hebrewDate(new HDate(local), lang),
          weekday,
          services,
          candleLighting: candleAt ? hhmm(candleAt) : null,
          havdalah: havdalahAt ? hhmm(havdalahAt) : null,
          parasha,
          holidays,
          zmanim: {
            alot: hhmmOrNull(z.alotHaShachar()),
            talit: hhmmOrNull(z.misheyakir()),
            sunrise: hhmmOrNull(z.sunrise()),
            shma: hhmmOrNull(z.sofZmanShma()),
            tfila: hhmmOrNull(z.sofZmanTfilla()),
            chatzot: hhmmOrNull(z.chatzot()),
            shkia: hhmmOrNull(z.shkiah()),
            tzet: hhmmOrNull(nightfall(z)),
          },
          note: overrideNote || autoNote || null,
          closed,
        },
      });
    }
    return out;
  }
}
