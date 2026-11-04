/**
 * Константы еврейского календаря для синагоги Калининграда.
 *
 * Координаты — геотег статьи Википедии о синагоге (ул. Октябрьская, 1А):
 * 54.70568333, 20.51555278 (WIKI; `SITE.geo` во `frontend/src/config/site.ts`).
 * Вторая опубликованная точка — 54.705921, 20.514934 (2GIS, маршрут музея): расхождение ~40 м,
 * на время заката/свечей не влияет. Уточнить у общины, если появится официальная точка.
 */
export const SYNAGOGUE_LOCATION = {
  latitude: 54.70568333,
  longitude: 20.51555278,
  tzid: 'Europe/Kaliningrad',
  name: 'Kaliningrad',
  countryCode: 'RU',
} as const;

/** Зажигание свечей — за 18 минут до заката (обычай большинства общин диаспоры). */
export const CANDLE_LIGHTING_MINUTES = 18;

/** Исход Шаббата/праздника — выход звёзд, солнце на 8.5° под горизонтом. */
export const HAVDALAH_DEGREES = 8.5;

/** Максимальная длина диапазона GET /calendar/days (дней включительно). */
export const MAX_RANGE_DAYS = 62;

/** Сколько дней показывает расписание по умолчанию. */
export const DEFAULT_RANGE_DAYS = 14;

/**
 * Запасной исход Шаббата/праздника — минут после заката, если солнце в эту ночь
 * не опускается на HAVDALAH_DEGREES (hebcal тогда молча не отдаёт Havdalah).
 *
 * В самой синагоге (54.7° с.ш.) правило не срабатывает: в солнцестояние солнце
 * уходит под горизонт на 90 − 54.7 − 23.44 ≈ 11.9° > 8.5°, проверено прогоном
 * 2026–2028. Это страховка на случай смены угла или координат.
 *
 * Почему 72, а не 50: фиксированные интервалы, которыми пользуются общины без
 * достижимого угла, — 42/50 мин (Игрот Моше, ОХ 4:62 — 50 мин для Нью-Йорка)
 * и 72 мин (Рабейну Там, Шулхан Арух ОХ 261:2; то же значение предлагает
 * hebcal как `havdalahMins: 72`). Для исхода Шаббата позднее время строже,
 * поэтому взят консервативный вариант — 72. Уточнить у раввина общины.
 */
export const HAVDALAH_FALLBACK_MINUTES = 72;

/**
 * Chabad.org — источник зманим, зажигания свечей и исхода Шаббата/праздников.
 * 908 — «Kaliningrad, Russia» в справочнике городов Chabad.org: тот же id стоит в
 * официальном виджете https://ru.chabad.org/tools/shared/candlelighting/candlelighting.js.asp?city=908
 * и в ссылке https://www.chabad.org/calendar/candlelighting.asp?locationId=908&locationType=1.
 */
export const CHABAD_LOCATION_ID = 908;

/** Страницы Chabad.org для ссылки «источник» (виджет и подвал сайта). */
export const CHABAD_CANDLES_URL =
  'https://www.chabad.org/calendar/candlelighting.asp?locationId=908&locationType=1';

/** Сколько запрос календаря ждёт Chabad.org, прежде чем отдать локальный расчёт. */
export const CHABAD_BUDGET_MS = 3_500;

/** Срок жизни кэша дня (зманим на дату не меняются). */
export const CHABAD_CACHE_DAYS = 7;

/** Прогрев кэша: сегодня + столько дней вперёд. */
export const CHABAD_WARM_DAYS = 35;

/**
 * «Nightfall (Tzeit Hakochavim)» в ленте Chabad.org для Калининграда совпадает с солнцем
 * на 6° под горизонтом (±1 мин; сверено 06.11.2026, 20.12.2026, 23.03.2027, 21.06.2027),
 * а «Shabbat Ends» — с 8.5° (HAVDALAH_DEGREES). Нужен, когда в ленте на день нет выхода звёзд.
 */
export const CHABAD_NIGHTFALL_DEGREES = 6;
