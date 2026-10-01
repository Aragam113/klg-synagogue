import type { LangCode } from '@common/localization';

/**
 * Русские названия для еврейского календаря: в @hebcal/core нет локали ru,
 * поэтому месяцы, главы и праздники переводятся здесь (общее знание, не факты общины).
 */

/** Месяцы в родительном падеже: «3 кислева 5787». Ключи — HDate.getMonthName(). */
export const MONTHS_RU: Record<string, string> = {
  Nisan: 'нисана',
  Iyyar: 'ияра',
  Sivan: 'сивана',
  Tamuz: 'тамуза',
  Av: 'ава',
  Elul: 'элуля',
  Tishrei: 'тишрея',
  Cheshvan: 'хешвана',
  Kislev: 'кислева',
  Tevet: 'тевета',
  "Sh'vat": 'швата',
  Adar: 'адара',
  'Adar I': 'адара I',
  'Adar II': 'адара II',
};

/** Месяцы в именительном падеже — для «Рош Ходеш …». */
const MONTHS_RU_NOM: Record<string, string> = {
  Nisan: 'Нисан',
  Iyyar: 'Ияр',
  Sivan: 'Сиван',
  Tamuz: 'Тамуз',
  Av: 'Ав',
  Elul: 'Элуль',
  Tishrei: 'Тишрей',
  Cheshvan: 'Хешван',
  Kislev: 'Кислев',
  Tevet: 'Тевет',
  "Sh'vat": 'Шват',
  Adar: 'Адар',
  'Adar I': 'Адар I',
  'Adar II': 'Адар II',
};

/** Недельные главы. Ключи — имена глав hebcal (ParshaEvent.parsha). */
export const PARSHIOT_RU: Record<string, string> = {
  Bereshit: 'Берешит',
  Noach: 'Ноах',
  'Lech-Lecha': 'Лех-Леха',
  Vayera: 'Ваера',
  'Chayei Sara': 'Хаей Сара',
  Toldot: 'Толдот',
  Vayetzei: 'Ваеце',
  Vayishlach: 'Ваишлах',
  Vayeshev: 'Ваешев',
  Miketz: 'Микец',
  Vayigash: 'Ваигаш',
  Vayechi: 'Ваехи',
  Shemot: 'Шмот',
  Vaera: 'Ваэра',
  Bo: 'Бо',
  Beshalach: 'Бешалах',
  Yitro: 'Итро',
  Mishpatim: 'Мишпатим',
  Terumah: 'Трума',
  Tetzaveh: 'Тецаве',
  'Ki Tisa': 'Ки Тиса',
  Vayakhel: 'Ваякгель',
  Pekudei: 'Пкудей',
  Vayikra: 'Ваикра',
  Tzav: 'Цав',
  Shmini: 'Шмини',
  Tazria: 'Тазриа',
  Metzora: 'Мецора',
  'Achrei Mot': 'Ахарей Мот',
  Kedoshim: 'Кдошим',
  Emor: 'Эмор',
  Behar: 'Бехар',
  Bechukotai: 'Бехукотай',
  Bamidbar: 'Бемидбар',
  Nasso: 'Насо',
  "Beha'alotcha": 'Беаалотха',
  "Sh'lach": 'Шлах',
  Korach: 'Корах',
  Chukat: 'Хукат',
  Balak: 'Балак',
  Pinchas: 'Пинхас',
  Matot: 'Матот',
  Masei: 'Масэй',
  Devarim: 'Дварим',
  Vaetchanan: 'Ваэтханан',
  Eikev: 'Экев',
  "Re'eh": 'Рээ',
  Shoftim: 'Шофтим',
  'Ki Teitzei': 'Ки Теце',
  'Ki Tavo': 'Ки Таво',
  Nitzavim: 'Ницавим',
  Vayeilech: 'Ваелех',
  "Ha'azinu": 'Аазину',
  'Vezot Haberakhah': 'Везот а-Браха',
};

/** Праздники и особые дни по началу описания hebcal (getDesc), длинные ключи — первыми. */
const HOLIDAYS_RU: [string, string][] = [
  ['Rosh Hashana LaBehemot', 'Рош а-Шана ла-беэмот'],
  ['Rosh Hashana', 'Рош а-Шана'],
  ['Yom Kippur Katan', 'Йом Кипур Катан'],
  ['Yom Kippur', 'Йом Кипур'],
  ['Sukkot', 'Суккот'],
  ['Shmini Atzeret', 'Шмини Ацерет'],
  ['Simchat Torah', 'Симхат Тора'],
  ['Chanukah', 'Ханука'],
  ['Tu BiShvat', 'Ту би-Шват'],
  ['Purim Katan', 'Пурим Катан'],
  ['Shushan Purim Katan', 'Шушан Пурим Катан'],
  ['Shushan Purim', 'Шушан Пурим'],
  ['Purim Meshulash', 'Пурим Мешулаш'],
  ['Purim', 'Пурим'],
  ['Pesach Sheni', 'Песах Шени'],
  ['Pesach', 'Песах'],
  ['Shavuot', 'Шавуот'],
  ["Tish'a B'Av", 'Тиша бе-Ав'],
  ["Tu B'Av", 'Ту бе-Ав'],
  ['Tzom Gedaliah', 'Пост Гедальи'],
  ["Asara B'Tevet", 'Пост 10 тевета'],
  ["Ta'anit Esther", 'Пост Эстер'],
  ["Ta'anit Bechorot", 'Пост первенцев'],
  ['Tzom Tammuz', 'Пост 17 тамуза'],
  ['Lag BaOmer', 'Лаг ба-Омер'],
  ['Leil Selichot', 'Слихот'],
  ['Rosh Chodesh', 'Рош Ходеш'],
  ['Shabbat Shuva', 'Шаббат Шува'],
  ['Shabbat Shekalim', 'Шаббат Шкалим'],
  ['Shabbat Zachor', 'Шаббат Захор'],
  ['Shabbat Parah', 'Шаббат Пара'],
  ['Shabbat HaChodesh', 'Шаббат а-Ходеш'],
  ['Shabbat HaGadol', 'Шаббат а-Гадоль'],
  ['Shabbat Chazon', 'Шаббат Хазон'],
  ['Shabbat Nachamu', 'Шаббат Нахаму'],
  ['Shabbat Shirah', 'Шаббат Шира'],
  ['Shabbat Rosh Chodesh', 'Шаббат Рош Ходеш'],
  ['Shabbat Machar Chodesh', 'Шаббат Махар Ходеш'],
];

const ROMAN: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
};

/** Русское название события-праздника по описанию hebcal; неизвестное — как есть (en). */
export function holidayNameRu(desc: string): string {
  let rest = desc;
  let prefix = '';
  if (rest.startsWith('Erev ')) {
    prefix = 'Канун: ';
    rest = rest.slice(5);
  }
  const hit = HOLIDAYS_RU.find(([en]) => rest.startsWith(en));
  if (!hit) return desc;
  const [en, ru] = hit;
  let tail = rest.slice(en.length).trim();
  if (en === 'Rosh Chodesh')
    return `${prefix}${ru} ${MONTHS_RU_NOM[tail] ?? tail}`;

  const notes: string[] = [];
  tail = tail.replace(/\(CH''M\)/, () => {
    notes.push('Холь а-моэд');
    return '';
  });
  tail = tail.replace(/\(Hoshana Raba\)/, () => {
    notes.push('Ошана Раба');
    return '';
  });
  tail = tail.trim();
  const candles = /^: (\d) Candles?$/.exec(tail);
  const day = /^: 8th Day$/.exec(tail);
  if (candles) tail = `: ${candles[1]}-я свеча`;
  else if (day) tail = ': 8-й день';
  else if (ROMAN[tail]) tail = ` (${ROMAN[tail]}-й день)`;
  else if (tail) tail = ` ${tail}`;
  const extra = notes.length ? `, ${notes.join(', ')}` : '';
  return `${prefix}${ru}${tail}${extra}`;
}

/** Ключ страницы праздника из basename hebcal: «Tish'a B'Av» → «tisha-bav». */
export function holidayKey(basename: string): string {
  return basename
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type Texts = Record<LangCode, string>;

export interface HolidayInfo {
  title: Texts;
  text: Texts;
}

/**
 * Краткие описания основных праздников — общее знание об иудаизме (не факты общины).
 * Иврит — машинный перевод; ключи — holidayKey(basename hebcal).
 */
export const HOLIDAY_INFO: Record<string, HolidayInfo> = {
  'rosh-hashana': {
    title: { ru: 'Рош а-Шана', en: 'Rosh Hashana', he: 'ראש השנה' },
    text: {
      ru: 'Еврейский Новый год, начало месяца тишрей. День суда, когда человек подводит итоги года. В синагоге трубят в шофар, за праздничным столом едят яблоко с мёдом — чтобы год был сладким.',
      en: 'The Jewish New Year, at the start of the month of Tishrei. A day of judgement and of taking stock of the year. The shofar is sounded in the synagogue, and apple dipped in honey is eaten for a sweet year.',
      he: 'ראש השנה היהודי, בתחילת חודש תשרי. יום הדין וחשבון הנפש של השנה. בבית הכנסת תוקעים בשופר, ובסעודת החג אוכלים תפוח בדבש לשנה מתוקה.',
    },
  },
  'yom-kippur': {
    title: { ru: 'Йом Кипур', en: 'Yom Kippur', he: 'יום כיפור' },
    text: {
      ru: 'Судный день — самый святой день года. Сутки поста и молитвы о прощении; большую часть дня проводят в синагоге. Завершается трублением в шофар.',
      en: 'The Day of Atonement, the holiest day of the year: a full day of fasting and prayer for forgiveness, much of it spent in the synagogue. It ends with the sounding of the shofar.',
      he: 'יום הכיפורים — היום הקדוש בשנה: יממה של צום ותפילה לסליחה, שרובה עוברת בבית הכנסת. היום מסתיים בתקיעת שופר.',
    },
  },
  sukkot: {
    title: { ru: 'Суккот', en: 'Sukkot', he: 'סוכות' },
    text: {
      ru: 'Праздник шалашей в память о странствиях по пустыне. Семь дней принято есть в сукке — шалаше с крышей из ветвей — и благословлять четыре вида растений: лулав, этрог, мирт и иву.',
      en: 'The Festival of Booths, recalling the wandering in the desert. For seven days meals are eaten in a sukkah, a hut roofed with branches, and a blessing is said over the four species: lulav, etrog, myrtle and willow.',
      he: 'חג הסוכות, זכר לנדודים במדבר. שבעה ימים אוכלים בסוכה שגגה מענפים, ומברכים על ארבעת המינים: לולב, אתרוג, הדס וערבה.',
    },
  },
  'shmini-atzeret': {
    title: { ru: 'Шмини Ацерет', en: 'Shmini Atzeret', he: 'שמיני עצרת' },
    text: {
      ru: 'Восьмой день праздника, завершающий Суккот. В этот день читают молитву о дожде и поминальную молитву Изкор.',
      en: 'The eighth day of assembly that closes Sukkot. The prayer for rain and the Yizkor memorial prayer are recited.',
      he: 'יום שמיני של חג, החותם את סוכות. אומרים בו תפילת גשם ותפילת יזכור.',
    },
  },
  'simchat-torah': {
    title: { ru: 'Симхат Тора', en: 'Simchat Torah', he: 'שמחת תורה' },
    text: {
      ru: 'Праздник радости Торы: заканчивается годовой цикл чтения Торы и сразу начинается новый. Со свитками танцуют вокруг бимы — хакафот.',
      en: 'Rejoicing of the Torah: the yearly cycle of Torah reading ends and immediately begins again. The scrolls are carried in joyful dances around the bimah — the hakafot.',
      he: 'שמחת תורה: מסיימים את מחזור קריאת התורה השנתי ומתחילים אותו מחדש. רוקדים עם ספרי התורה סביב הבימה — הקפות.',
    },
  },
  chanukah: {
    title: { ru: 'Ханука', en: 'Chanukah', he: 'חנוכה' },
    text: {
      ru: 'Восьмидневный праздник света в память о победе Маккавеев и чуде с маслом в Иерусалимском Храме. Каждый вечер зажигают ханукию, добавляя по одной свече.',
      en: 'The eight-day festival of lights, remembering the Maccabees’ victory and the miracle of the oil in the Temple in Jerusalem. Each evening the chanukiah is lit, adding one candle a night.',
      he: 'חג האורים בן שמונה ימים, זכר לניצחון המכבים ולנס פך השמן בבית המקדש. בכל ערב מדליקים חנוכייה ומוסיפים נר אחד.',
    },
  },
  'tu-bishvat': {
    title: { ru: 'Ту би-Шват', en: 'Tu BiShvat', he: 'ט״ו בשבט' },
    text: {
      ru: 'Новый год деревьев, 15 швата. Принято есть плоды Земли Израиля — финики, инжир, гранаты, оливки — и сажать деревья.',
      en: 'The New Year for Trees on the 15th of Shvat. It is customary to eat fruits of the Land of Israel — dates, figs, pomegranates, olives — and to plant trees.',
      he: 'ראש השנה לאילנות, ט״ו בשבט. נוהגים לאכול מפירות ארץ ישראל — תמרים, תאנים, רימונים, זיתים — ולטעת עצים.',
    },
  },
  purim: {
    title: { ru: 'Пурим', en: 'Purim', he: 'פורים' },
    text: {
      ru: 'Праздник спасения евреев Персии от Амана. Читают свиток Эстер, дарят друг другу угощения, дают милостыню и устраивают весёлую трапезу; дети приходят в костюмах.',
      en: 'Celebrates the rescue of the Jews of Persia from Haman. The Scroll of Esther is read, gifts of food are exchanged, charity is given and a festive meal is held; children come in costumes.',
      he: 'חג ההצלה של יהודי פרס מהמן. קוראים את מגילת אסתר, שולחים משלוחי מנות, נותנים מתנות לאביונים ועורכים סעודה שמחה; הילדים מתחפשים.',
    },
  },
  pesach: {
    title: { ru: 'Песах', en: 'Pesach (Passover)', he: 'פסח' },
    text: {
      ru: 'Праздник исхода из Египта. В первый вечер проводят седер — трапезу с рассказом об исходе и мацой; всю неделю квасное не едят.',
      en: 'The festival of the Exodus from Egypt. On the first evening the Seder is held — a meal retelling the Exodus, with matzah; no leavened food is eaten for the whole week.',
      he: 'חג יציאת מצרים. בערב הראשון עורכים ליל סדר — סעודה עם סיפור יציאת מצרים ומצה; כל השבוע אין אוכלים חמץ.',
    },
  },
  shavuot: {
    title: { ru: 'Шавуот', en: 'Shavuot', he: 'שבועות' },
    text: {
      ru: 'Праздник дарования Торы на горе Синай, через семь недель после Песаха. В синагоге читают Десять заповедей; принято есть молочное.',
      en: 'The festival of the giving of the Torah at Mount Sinai, seven weeks after Pesach. The Ten Commandments are read in the synagogue, and dairy food is customary.',
      he: 'חג מתן תורה בהר סיני, שבעה שבועות אחרי פסח. בבית הכנסת קוראים את עשרת הדיברות, ונוהגים לאכול מאכלי חלב.',
    },
  },
  'tisha-bav': {
    title: { ru: 'Тиша бе-Ав', en: 'Tisha B’Av', he: 'תשעה באב' },
    text: {
      ru: 'День траура по разрушению Первого и Второго Храмов. Пост от заката до выхода звёзд; в синагоге читают Плач Иеремии (Эйха).',
      en: 'A day of mourning for the destruction of the First and Second Temples. A fast from sunset to nightfall; the Book of Lamentations (Eicha) is read in the synagogue.',
      he: 'יום אבל על חורבן בית המקדש הראשון והשני. צום משקיעה עד צאת הכוכבים; בבית הכנסת קוראים את מגילת איכה.',
    },
  },
};
