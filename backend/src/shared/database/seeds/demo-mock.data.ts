/**
 * Демо-афиша и демо-сборы для показа разделов (`npm run seed:demo`).
 * Это НЕ факты общины: каждая запись — slug `demo-*`, на сайте — плашка «Пример».
 * Цены и суммы — круглые демонстрационные, имён и телефонов нет.
 * Даты считаются от «сегодня» в момент сидирования (`demoPlan(now)`), праздник — ближайший по hebcal.
 */
import { flags, HDate, HebrewCalendar } from '@hebcal/core';
import { LocalizedString } from '@common/localization';
import { PriceTier } from '@modules/content/entities';

export const DEMO_PREFIX = 'demo-';
/** Калининград — постоянный UTC+2. */
const KLD_OFFSET_H = 2;
const DAY_MS = 86_400_000;

export interface DemoEvent {
  slug: string;
  title: LocalizedString;
  description: LocalizedString;
  place: LocalizedString;
  /** Файл из seed-assets/photos (обложка берётся из уже засеянного альбома). */
  coverPhoto: string;
  startsAt: Date;
  endsAt: Date;
  isPaid: boolean;
  priceTiers: PriceTier[];
  capacity: number | null;
}

export interface DemoFundraiser {
  slug: string;
  title: LocalizedString;
  body: LocalizedString;
  coverPhoto: string;
  goalRub: number;
  raisedRub: number;
  supporters: number;
  status: 'active' | 'closed';
  endsAt: Date | null;
  /** Оплаченные демо-пожертвования (анонимные), уже входят в raisedRub/supporters. */
  payments: number[];
}

const NOTE: LocalizedString = {
  ru: 'Это пример для демонстрации раздела сайта, а не настоящее событие общины.',
  en: 'This is an example that demonstrates this section of the site, not a real community event.',
  he: 'זוהי דוגמה להדגמת המדור באתר, ולא אירוע אמיתי של הקהילה.',
};
const FUND_NOTE: LocalizedString = {
  ru: 'Это пример для демонстрации раздела сайта, а не настоящий сбор общины.',
  en: 'This is an example that demonstrates this section of the site, not a real community fundraiser.',
  he: 'זוהי דוגמה להדגמת המדור באתר, ולא מגבית אמיתית של הקהילה.',
};
const PLACE: LocalizedString = {
  ru: 'Новая синагога',
  en: 'New Synagogue',
  he: 'בית הכנסת החדש',
};

const withNote = (
  text: LocalizedString,
  note: LocalizedString
): LocalizedString => ({
  ru: `${text.ru}\n\n${note.ru}`,
  en: `${text.en}\n\n${note.en}`,
  he: `${text.he}\n\n${note.he}`,
});

/** Дата YYYY-MM-DD по Калининграду. */
export const kldDate = (d: Date): string =>
  new Date(d.getTime() + KLD_OFFSET_H * 3_600_000).toISOString().slice(0, 10);

const addDays = (date: string, n: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

const weekday = (date: string): number =>
  new Date(`${date}T00:00:00Z`).getUTCDay();

/** Пятница и суббота → ближайшее воскресенье (никаких событий в Шаббат). */
const offShabbat = (date: string): string =>
  weekday(date) === 5
    ? addDays(date, 2)
    : weekday(date) === 6
      ? addDays(date, 1)
      : date;

/** Местное время Калининграда → Date. */
const at = (date: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - KLD_OFFSET_H, m));
};
const hours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

interface HolidayIdea {
  match: (desc: string, f: number) => boolean;
  time: string;
  title: LocalizedString;
  text: LocalizedString;
}

const HOLIDAYS: HolidayIdea[] = [
  {
    match: (_d, f) => (f & flags.CHANUKAH_CANDLES) !== 0,
    time: '17:00',
    title: {
      ru: 'Ханука: зажигаем ханукию вместе',
      en: 'Chanukah: lighting the menorah together',
      he: 'חנוכה: מדליקים יחד את החנוכייה',
    },
    text: {
      ru: 'Праздничный вечер Хануки: зажжение свечей, рассказ о празднике, пончики-суфганиёт и игра в севивон для детей и взрослых.',
      en: 'A Chanukah evening: candle lighting, the story of the holiday, sufganiyot doughnuts and a dreidel game for children and adults.',
      he: 'ערב חנוכה: הדלקת נרות, סיפור החג, סופגניות ומשחק סביבון לילדים ולמבוגרים.',
    },
  },
  {
    match: (d) => d === 'Tu BiShvat',
    time: '18:30',
    title: {
      ru: 'Седер Ту би-Шват',
      en: 'Tu BiShvat seder',
      he: 'סדר ט״ו בשבט',
    },
    text: {
      ru: 'Новый год деревьев: седер с плодами Земли Израиля, четыре бокала и рассказ о традициях праздника.',
      en: 'The New Year of the trees: a seder with the fruits of the Land of Israel, four cups and the customs of the day.',
      he: 'ראש השנה לאילנות: סדר עם פירות ארץ ישראל, ארבע כוסות ומנהגי החג.',
    },
  },
  {
    match: (d) => d === 'Purim',
    time: '17:00',
    title: {
      ru: 'Пурим: чтение Мегилы и пуримшпиль',
      en: 'Purim: Megillah reading and Purimshpil',
      he: 'פורים: קריאת המגילה ופורימשפיל',
    },
    text: {
      ru: 'Чтение свитка Эстер, костюмы, весёлый пуримшпиль и праздничное угощение.',
      en: 'Reading of the Scroll of Esther, costumes, a merry Purimshpil and a festive treat.',
      he: 'קריאת מגילת אסתר, תחפושות, פורימשפיל עליז וכיבוד חגיגי.',
    },
  },
  {
    match: (d) => /^Pesach .*CH''M/.test(d),
    time: '12:00',
    title: {
      ru: 'Песах: праздничный день в общине',
      en: 'Pesach: a festive day at the community',
      he: 'פסח: יום חגיגי בקהילה',
    },
    text: {
      ru: 'Дни холь а-моэд: рассказ об Исходе, маца и семейная программа.',
      en: 'Chol HaMoed: the story of the Exodus, matzah and a family programme.',
      he: 'חול המועד: סיפור יציאת מצרים, מצה ותוכנית משפחתית.',
    },
  },
  {
    match: (d) => d === 'Lag BaOmer',
    time: '16:00',
    title: {
      ru: 'Лаг ба-Омер: семейный пикник',
      en: 'Lag BaOmer: a family picnic',
      he: 'ל״ג בעומר: פיקניק משפחתי',
    },
    text: {
      ru: 'Праздник под открытым небом: костёр, игры для детей и рассказ о рабби Шимоне бар Йохае.',
      en: 'An outdoor celebration: a bonfire, games for children and the story of Rabbi Shimon bar Yochai.',
      he: 'חגיגה באוויר הפתוח: מדורה, משחקים לילדים וסיפורו של רבי שמעון בר יוחאי.',
    },
  },
  {
    match: (d) => d === "Tu B'Av",
    time: '19:00',
    title: {
      ru: 'Ту бе-Ав: вечер песен',
      en: "Tu B'Av: an evening of songs",
      he: 'ט״ו באב: ערב שירים',
    },
    text: {
      ru: 'Светлый летний праздник: песни, истории и угощение.',
      en: 'A bright summer holiday: songs, stories and refreshments.',
      he: 'חג קיצי ושמח: שירים, סיפורים וכיבוד.',
    },
  },
  {
    match: (d) => /^Sukkot .*CH''M/.test(d),
    time: '12:00',
    title: {
      ru: 'Суккот: открытая сукка',
      en: 'Sukkot: an open sukkah',
      he: 'סוכות: סוכה פתוחה',
    },
    text: {
      ru: 'Дни холь а-моэд в сукке: благословение на четыре вида растений и угощение для гостей.',
      en: 'Chol HaMoed in the sukkah: the blessing over the four species and refreshments for guests.',
      he: 'חול המועד בסוכה: ברכה על ארבעת המינים וכיבוד לאורחים.',
    },
  },
];

/** Ближайший подходящий праздник по hebcal (не в Шаббат) в окне [from, from+days]. */
export function nearestHoliday(
  from: string,
  days: number
): { date: string; idea: HolidayIdea } | null {
  const start = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${addDays(from, days)}T12:00:00Z`);
  const evs = HebrewCalendar.calendar({ start, end, il: false });
  for (const ev of evs) {
    const date = new HDate(ev.getDate()).greg();
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (weekday(iso) === 5 || weekday(iso) === 6) continue;
    const idea = HOLIDAYS.find((h) => h.match(ev.getDesc(), ev.getFlags()));
    if (idea) return { date: iso, idea };
  }
  return null;
}

/** Лестница цен: ступени до «за 21 день» и «за 7 дней» до события (прошедшие отбрасываются), затем финальная. */
const ladder = (
  today: string,
  eventDate: string,
  prices: number[]
): PriceTier[] => {
  const cut = [21, 7].slice(3 - prices.length);
  const tiers: PriceTier[] = [];
  prices.slice(0, -1).forEach((priceRub, i) => {
    const until = addDays(eventDate, -cut[i]);
    if (until >= today) tiers.push({ until, priceRub });
  });
  tiers.push({ until: null, priceRub: prices[prices.length - 1] });
  return tiers;
};

/** Весь демо-набор на «сегодня» = now. */
export function demoPlan(now: Date): {
  events: DemoEvent[];
  fundraisers: DemoFundraiser[];
} {
  const today = kldDate(now);
  const day = (n: number) => offShabbat(addDays(today, n));
  const sunday = (n: number) => {
    const d = addDays(today, n);
    return addDays(d, (7 - weekday(d)) % 7);
  };
  const ev = (
    slug: string,
    date: string,
    time: string,
    durationH: number,
    e: Omit<
      DemoEvent,
      'slug' | 'startsAt' | 'endsAt' | 'description' | 'place'
    > & {
      text: LocalizedString;
      place?: LocalizedString;
    }
  ): DemoEvent => {
    const startsAt = at(date, time);
    const { text, place, ...rest } = e;
    return {
      slug: DEMO_PREFIX + slug,
      startsAt,
      endsAt: hours(startsAt, durationH),
      description: withNote(text, NOTE),
      place: place ?? PLACE,
      ...rest,
    };
  };

  const events: DemoEvent[] = [
    ev('vecher-znakomstva', day(9), '19:00', 2, {
      title: {
        ru: 'Вечер знакомства с общиной',
        en: 'Meet the community evening',
        he: 'ערב היכרות עם הקהילה',
      },
      text: {
        ru: 'Неформальная встреча для тех, кто впервые приходит в синагогу: экскурсия по зданию, чай и ответы на вопросы. Вход свободный, но нужна регистрация — мест немного.',
        en: 'An informal meeting for first-time visitors: a tour of the building, tea and answers to questions. Free entry, registration required — places are limited.',
        he: 'מפגש לא רשמי למי שמגיע לבית הכנסת בפעם הראשונה: סיור בבניין, תה ותשובות לשאלות. הכניסה חופשית, נדרשת הרשמה — מספר המקומות מוגבל.',
      },
      coverPhoto: 'commons_Kaliningrad_Synagoge_1.jpg',
      isPaid: false,
      priceTiers: [],
      capacity: 40,
    }),
    ev('lekciya-istoriya', day(16), '19:00', 1.5, {
      title: {
        ru: 'Лекция «Синагоги Кёнигсберга»',
        en: 'Lecture: the synagogues of Königsberg',
        he: 'הרצאה: בתי הכנסת של קניגסברג',
      },
      text: {
        ru: 'Рассказ о еврейской общине довоенного Кёнигсберга, архитектуре Новой синагоги 1896 года и её возрождении. Вход свободный.',
        en: 'The Jewish community of pre-war Königsberg, the architecture of the 1896 New Synagogue and its revival. Free entry.',
        he: 'הקהילה היהודית בקניגסברג שלפני המלחמה, האדריכלות של בית הכנסת החדש משנת 1896 ותחייתו. הכניסה חופשית.',
      },
      coverPhoto: 'commons_Königsberg._Neue_Synagoge_-01.jpg',
      isPaid: false,
      priceTiers: [],
      capacity: null,
    }),
    ev('detskaya-programma', sunday(22), '12:00', 2, {
      title: {
        ru: 'Детская программа: буквы алеф-бета',
        en: "Children's programme: the Aleph-Bet",
        he: 'תוכנית לילדים: האלף-בית',
      },
      text: {
        ru: 'Игровое занятие для детей 5–10 лет: учим первые буквы иврита, рисуем и слушаем истории. Родители могут остаться на чай.',
        en: 'A playful session for children aged 5–10: first Hebrew letters, drawing and stories. Parents are welcome to stay for tea.',
        he: 'מפגש משחקי לילדים בני 5–10: האותיות הראשונות בעברית, ציור וסיפורים. ההורים מוזמנים להישאר לתה.',
      },
      coverPhoto: 'commons_Синагога_в_Калининграде.jpg',
      isPaid: false,
      priceTiers: [],
      capacity: 20,
    }),
    ev('koncert', day(38), '19:00', 2, {
      title: {
        ru: 'Концерт еврейской музыки',
        en: 'A concert of Jewish music',
        he: 'קונצרט מוזיקה יהודית',
      },
      text: {
        ru: 'Клезмер, хасидские напевы и песни на идише. Чем раньше билет — тем он дешевле.',
        en: 'Klezmer, Hasidic niggunim and Yiddish songs. The earlier you buy, the cheaper the ticket.',
        he: 'כליזמר, ניגונים חסידיים ושירים ביידיש. ככל שקונים מוקדם יותר — הכרטיס זול יותר.',
      },
      coverPhoto:
        'commons_IMG_Kaliningrad_-_New_Synagogue_in_Königsberg_-_2024-06-11_-_p2.jpg',
      isPaid: true,
      priceTiers: ladder(today, day(38), [500, 700, 1000]),
      capacity: 120,
    }),
    ev('master-klass-hala', day(50), '18:30', 2, {
      title: {
        ru: 'Мастер-класс: печём халу',
        en: 'Workshop: baking challah',
        he: 'סדנה: אופים חלה',
      },
      text: {
        ru: 'Замешиваем тесто, учимся плести халу и узнаём, почему её пекут к Шаббату. Все продукты включены.',
        en: 'Kneading dough, braiding challah and learning why it is baked for Shabbat. All ingredients included.',
        he: 'לשים בצק, קולעים חלה ולומדים מדוע אופים אותה לשבת. כל המצרכים כלולים.',
      },
      coverPhoto: 'commons_Kaliningrad_Synagoge_2.jpg',
      isPaid: true,
      priceTiers: ladder(today, day(50), [300, 500]),
      capacity: 15,
    }),
  ];

  const holiday = nearestHoliday(addDays(today, 7), 70);
  if (holiday) {
    events.push(
      ev('prazdnik', holiday.date, holiday.idea.time, 2.5, {
        title: holiday.idea.title,
        text: holiday.idea.text,
        coverPhoto: 'commons_Kaliningrad_-_Synagogue_view_from_water.jpg',
        isPaid: false,
        priceTiers: [],
        capacity: null,
      })
    );
  }
  events.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const fund = (
    slug: string,
    f: Omit<DemoFundraiser, 'slug' | 'body'> & { text: LocalizedString }
  ): DemoFundraiser => {
    const { text, ...rest } = f;
    return {
      slug: DEMO_PREFIX + slug,
      body: withNote(text, FUND_NOTE),
      ...rest,
    };
  };
  const fundraisers: DemoFundraiser[] = [
    fund('sidury', {
      title: {
        ru: 'Новые сидуры для молитвенного зала',
        en: 'New siddurim for the prayer hall',
        he: 'סידורים חדשים לאולם התפילה',
      },
      text: {
        ru: 'Собираем на комплект молитвенников с переводом на русский язык, чтобы каждому гостю синагоги хватило сидура.',
        en: 'Raising funds for a set of prayer books with Russian translation, so that every visitor has a siddur.',
        he: 'אוספים לסט סידורים עם תרגום לרוסית, כדי שלכל אורח בבית הכנסת יהיה סידור.',
      },
      coverPhoto: 'commons_Синагога_32895_.jpg',
      goalRub: 300_000,
      raisedRub: 60_000,
      supporters: 14,
      status: 'active',
      endsAt: at(addDays(today, 90), '23:00'),
      payments: [1_000, 3_000],
    }),
    fund('detskiy-lager', {
      title: {
        ru: 'Детский лагерь на каникулах',
        en: 'A holiday camp for children',
        he: 'מחנה חופשה לילדים',
      },
      text: {
        ru: 'Неделя занятий, экскурсий и праздников для детей общины на каникулах: питание, материалы и транспорт.',
        en: 'A week of classes, excursions and celebrations for the community children: meals, materials and transport.',
        he: 'שבוע של שיעורים, טיולים וחגיגות לילדי הקהילה בחופשה: ארוחות, חומרים והסעות.',
      },
      coverPhoto: 'commons_Kaliningrad_Synagoge_Fischerdorf_1.jpg',
      goalRub: 500_000,
      raisedRub: 325_000,
      supporters: 48,
      status: 'active',
      endsAt: at(addDays(today, 60), '23:00'),
      payments: [5_000, 2_000, 1_000],
    }),
    fund('prazdnichnye-nabory', {
      title: {
        ru: 'Праздничные наборы для пожилых',
        en: 'Holiday food parcels for the elderly',
        he: 'סלי חג לקשישים',
      },
      text: {
        ru: 'Продуктовые наборы к празднику для пожилых членов общины, которые живут одни.',
        en: 'Holiday food parcels for elderly community members who live alone.',
        he: 'סלי מזון לחג לחברי קהילה קשישים הגרים לבדם.',
      },
      coverPhoto:
        'commons_Rekonstruierte_neue_Synagoge_Kaliningrad_am_Vorabend_der_Eröffnung.jpg',
      goalRub: 150_000,
      raisedRub: 146_000,
      supporters: 61,
      status: 'active',
      endsAt: at(addDays(today, 30), '23:00'),
      payments: [2_000, 1_000],
    }),
    fund('kuhnya', {
      title: {
        ru: 'Оборудование кухни для общинных трапез',
        en: 'Kitchen equipment for community meals',
        he: 'ציוד מטבח לסעודות הקהילה',
      },
      text: {
        ru: 'Сбор закрыт: на собранные средства куплены плита и холодильник для кошерной кухни. Спасибо всем, кто помог!',
        en: 'Closed: the funds bought a stove and a fridge for the kosher kitchen. Thank you to everyone who helped!',
        he: 'המגבית נסגרה: בכסף שנאסף נקנו כיריים ומקרר למטבח הכשר. תודה לכל מי שעזר!',
      },
      coverPhoto: 'commons_Kaliningrad_New_Synagogue_Aug_2018.jpg',
      goalRub: 200_000,
      raisedRub: 200_000,
      supporters: 83,
      status: 'closed',
      endsAt: at(addDays(today, -20), '23:00'),
      payments: [3_000],
    }),
  ];
  return { events, fundraisers };
}
