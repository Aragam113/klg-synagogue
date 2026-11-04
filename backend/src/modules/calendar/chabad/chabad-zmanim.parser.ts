/**
 * Разбор RSS «Zmanim — Halachic Times» Chabad.org за один день.
 *
 * Источник (общедоступная лента Chabad.org для синдикации, требует указания авторства):
 *   https://www.chabad.org/tools/rss/zmanim.xml?locationid=908&locationtype=1&tdate=M/D/YYYY
 * Каждый `<item>`: `<category>` — время «h:mm AM|PM» по местному времени Калининграда,
 * `<title>` — «Название - h:mm PM -- (M/D/YYYY)». Иногда в одном пункте два зманим
 * через « | »: «Nightfall (Tzeit Hakochavim) | Fast Ends», «Candle Lighting | Fast Begins».
 *
 * Значения подписей сверены с лентой 04.11.2026 для дат 2026–2027 (Шаббат, Песах,
 * Шавуот, Рош а-Шана, Йом Кипур, посты, Ханука).
 */

/** 'HH:MM' по Калининграду или null. */
export interface ChabadZmanim {
  alot: string | null;
  talit: string | null;
  sunrise: string | null;
  shma: string | null;
  tfila: string | null;
  chatzot: string | null;
  minchaGedola: string | null;
  minchaKetana: string | null;
  plag: string | null;
  shkia: string | null;
  tzet: string | null;
}

export interface ChabadDay {
  /** YYYY-MM-DD */
  date: string;
  zmanim: ChabadZmanim;
  /** Зажигание свечей (Шаббат/праздник). */
  candleLighting: string | null;
  /** «Candle Lighting after» — зажигать не раньше (второй день праздника, исход Шаббата перед праздником). */
  candleAfter: boolean;
  /** Исход Шаббата / праздника («Shabbat Ends», «Holiday Ends», «Holiday/Fast Ends»). */
  havdalah: string | null;
  fastBegins: string | null;
  fastEnds: string | null;
  /** Самое раннее зажигание ханукальных свечей. */
  chanukah: string | null;
}

const EMPTY_ZMANIM: ChabadZmanim = {
  alot: null,
  talit: null,
  sunrise: null,
  shma: null,
  tfila: null,
  chatzot: null,
  minchaGedola: null,
  minchaKetana: null,
  plag: null,
  shkia: null,
  tzet: null,
};

/** Подпись Chabad.org → поле зманим. Порядок не важен: подписи не пересекаются. */
const ZMAN_LABELS: [RegExp, keyof ChabadZmanim][] = [
  [/^Dawn\b/i, 'alot'],
  [/Misheyakir/i, 'talit'],
  [/^Sunrise\b/i, 'sunrise'],
  [/^Latest Shema\b/i, 'shma'],
  [/^Latest Shacharit\b/i, 'tfila'],
  [/Chatzot Hayom/i, 'chatzot'],
  [/Mincha Gedolah/i, 'minchaGedola'],
  [/^Mincha Ketanah\b/i, 'minchaKetana'],
  [/^Plag Hamincha\b/i, 'plag'],
  [/^Sunset\b/i, 'shkia'],
  [/^Nightfall\b/i, 'tzet'],
];

const ITEM_RE = /<item>([\s\S]*?)<\/item>/g;
const TAG_RE = (tag: string) => new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** «4:34 PM» → '16:34'; иначе null. */
export function to24h(s: string): string | null {
  const m = /^\s*(\d{1,2}):(\d{2})\s*([AP])\.?M\.?\s*$/i.exec(s);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === 'P') h += 12;
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** 'YYYY-MM-DD' → 'M/D/YYYY' (формат параметра tdate). */
export function chabadDateParam(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${m}/${d}/${y}`;
}

/** <english_date>November 04, 2026</english_date> → '2026-11-04'. */
function feedDate(xml: string): string | null {
  const raw = TAG_RE('english_date').exec(xml)?.[1];
  if (!raw) return null;
  const t = Date.parse(`${decode(raw).trim()} 12:00 UTC`);
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

/**
 * Разбирает ленту. Бросает ошибку, если это не лента зманим на нужную дату
 * (Chabad.org при ошибке отдаёт HTML-страницу или ленту на сегодня).
 */
export function parseChabadZmanim(xml: string, date: string): ChabadDay {
  if (!xml.includes('<rss')) throw new Error('не RSS');
  const actual = feedDate(xml);
  if (actual !== date)
    throw new Error(`лента на ${actual ?? '?'} вместо ${date}`);

  const day: ChabadDay = {
    date,
    zmanim: { ...EMPTY_ZMANIM },
    candleLighting: null,
    candleAfter: false,
    havdalah: null,
    fastBegins: null,
    fastEnds: null,
    chanukah: null,
  };

  for (const [, item] of xml.matchAll(ITEM_RE)) {
    const time = to24h(decode(TAG_RE('category').exec(item)?.[1] ?? ''));
    if (!time) continue; // «Shaah Zmanit — 46:43 min.»
    const title = decode(TAG_RE('title').exec(item)?.[1] ?? '');
    // «Label - 4:34 PM -- (11/6/2026)» → «Label»; в одной подписи бывает два зманим.
    const label = title.split(/\s+-\s+\d{1,2}:\d{2}/)[0];
    for (const part of label.split(/\s*\|\s*|\r?\n/).map((s) => s.trim())) {
      if (!part) continue;
      if (/^Midnight\b/i.test(part)) continue; // полночь — уже следующая дата
      if (/^Candle Lighting\b/i.test(part)) {
        day.candleLighting = time;
        day.candleAfter = /\bafter\b/i.test(part);
      } else if (/^(Shabbat|Holiday)[\w/]*\s+Ends\b/i.test(part)) {
        day.havdalah = time;
      } else if (/^Fast Ends\b/i.test(part)) {
        day.fastEnds = time;
      } else if (/^Fast Begins\b/i.test(part)) {
        day.fastBegins = time;
      } else if (/Chanukah/i.test(part)) {
        day.chanukah = time;
      } else {
        const hit = ZMAN_LABELS.find(([re]) => re.test(part));
        if (hit) day.zmanim[hit[1]] = time;
      }
    }
  }
  if (!day.zmanim.sunrise && !day.zmanim.shkia)
    throw new Error('в ленте нет зманим');
  return day;
}
