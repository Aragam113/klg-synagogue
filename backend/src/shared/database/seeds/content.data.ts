/**
 * Данные сидов контента. Каждый факт о синагоге/общине — только с источником:
 * `// src: <код>` — метка опубликованного источника (OF-home → `SRC.ofHome`
 * во `frontend/src/config/site.ts`). Чего в источниках нет — видимая заглушка `[ВПИШИ: …]`.
 * Строка с телефоном, ценой, e-mail или ссылкой без `// src:` роняет
 * test/content-seed.e2e-spec.ts.
 *
 * Событий и сборов здесь нет намеренно: будущих событий с датой и ценой
 * в источниках не найдено, сумма сбора на микву не опубликована (OF-mikva).
 */
import { LocalizedString } from '@common/localization';

const ADDRESS: LocalizedString = {
  ru: '236006, Калининград, ул. Октябрьская, 1А', // src: OF-home, OF-cont, JM-cont
  en: '1A Oktyabrskaya St, Kaliningrad, 236006', // src: OF-home, OF-cont, JM-cont
  he: 'רחוב אוקטיאברסקאיה 1A, קלינינגרד', // src: OF-home, OF-cont, JM-cont
};

export interface SeedProgram {
  title: LocalizedString;
  audience: LocalizedString | null;
  schedule: LocalizedString | null;
  contact: string | null;
}

export const PROGRAMS: SeedProgram[] = [
  {
    // Программы общины; источники — FEOR, TL-comm
    title: { ru: 'Колель Тора', en: 'Kollel Torah', he: 'כולל תורה' },
    audience: { ru: 'Для мужчин', en: 'For men', he: 'לגברים' },
    schedule: {
      ru: 'Ежедневно в 19:00',
      en: 'Daily at 19:00',
      he: 'כל יום בשעה 19:00',
    }, // src: TL-comm
    contact: null,
  },
  {
    title: { ru: 'STARS', en: 'STARS', he: 'STARS' }, // src: FEOR, TL-comm
    audience: {
      ru: 'Молодёжь 18–28 лет', // src: TL-comm
      en: 'Young people aged 18–28', // src: TL-comm
      he: 'צעירים בגילאי 18–28', // src: TL-comm
    },
    schedule: {
      ru: 'По четвергам в 19:00',
      en: 'Thursdays at 19:00',
      he: 'בימי חמישי בשעה 19:00',
    }, // src: TL-comm
    contact: '+7 (4012) 46-43-45', // src: OLD-n44 («запись по 46-43-45»), OF-home
  },
  {
    title: {
      ru: 'Воскресная школа',
      en: 'Sunday school',
      he: 'בית ספר של יום ראשון',
    }, // src: FEOR, TL-comm
    audience: {
      ru: 'Дети 5–12 лет',
      en: 'Children aged 5–12',
      he: 'ילדים בגילאי 5–12',
    }, // src: TL-comm, GOTOV-bereshit
    schedule: {
      ru: 'По воскресеньям в 11:00',
      en: 'Sundays at 11:00',
      he: 'בימי ראשון בשעה 11:00',
    }, // src: TL-comm
    contact: null,
  },
  {
    title: { ru: 'Встреча Шаббата', en: 'Kabbalat Shabbat', he: 'קבלת שבת' }, // src: TL-comm, OF-prak
    audience: { ru: 'Для всех', en: 'Open to everyone', he: 'לכולם' },
    schedule: {
      ru: 'По пятницам в 19:00',
      en: 'Fridays at 19:00',
      he: 'בימי שישי בשעה 19:00',
    }, // src: TL-comm, OLD-n36
    contact: null,
  },
  {
    title: { ru: 'Женский Колель', en: "Women's Kollel", he: 'כולל נשים' }, // src: GOTOV-kolel
    audience: { ru: 'Для женщин', en: 'For women', he: 'לנשים' },
    schedule: {
      ru: 'По предварительной регистрации', // src: GOTOV-kolel
      en: 'By prior registration', // src: GOTOV-kolel
      he: 'בהרשמה מראש', // src: GOTOV-kolel
    },
    contact: null,
  },
];

export interface SeedDepartment {
  title: LocalizedString;
  description: LocalizedString | null;
  address: LocalizedString | null;
  phones: string[];
  email: string | null;
  hours: LocalizedString | null;
}

export const DEPARTMENTS: SeedDepartment[] = [
  {
    title: { ru: 'Приёмная раввина', en: "Rabbi's office", he: 'לשכת הרב' }, // src: TL-recep
    description: {
      ru: 'По записи у секретаря: вопросы религии, свадьба по еврейскому обряду, развод, обрезание, погребение, подтверждение еврейского происхождения, гиюр.', // src: TL-recep
      en: 'By appointment via the secretary: religious questions, Jewish wedding, divorce, circumcision, burial, confirmation of Jewish descent, conversion.', // src: TL-recep
    },
    address: ADDRESS,
    phones: ['+7 (4012) 46-43-45'], // src: OF-home, OF-cont, FEOR, TL-recep
    email: 'Kaliningrad@feor.ru', // src: OF-home, OF-cont, FEOR
    hours: { ru: '[ВПИШИ: часы приёма]' },
  },
  {
    title: { ru: 'Кошерная столовая', en: 'Kosher canteen', he: 'מסעדה כשרה' }, // src: OF-home, TL-kosher
    description: {
      ru: 'В меню представлены блюда как еврейской, так и привычной европейской кухни. Возможна организация питания для туристических групп.', // src: TL-kosher
      en: 'Jewish and familiar European dishes. Meals for tourist groups can be arranged.', // src: TL-kosher
    },
    address: { ru: '[ВПИШИ: адрес/этаж столовой]' },
    phones: ['+7 (909) 777-12-17'], // src: OF-home, TL-comm, 2GIS-mus
    email: null,
    hours: {
      ru: 'Вс–Чт 10:00–18:00, Пт 10:00–16:00, Сб — выходной', // src: TL-kosher
      en: 'Sun–Thu 10:00–18:00, Fri 10:00–16:00, Sat closed', // src: TL-kosher
      he: 'א׳–ה׳ 10:00–18:00, ו׳ 10:00–16:00, שבת סגור', // src: TL-kosher
    },
  },
  {
    title: {
      ru: 'Музей «Новая синагога»',
      en: '"New Synagogue" Museum',
      he: 'מוזיאון "בית הכנסת החדש"',
    }, // src: JM-info, JM-first
    description: {
      ru: 'Постоянная выставка об истории и культуре еврейского Кёнигсберга: разделы «Приезд», «Остаться», «Изгнание», «Уничтожение». Музей открыт 18 сентября 2022 года, находится на 2 этаже здания.', // src: JM-info, JM-first, 2GIS-mus
      en: 'Permanent exhibition on the history and culture of Jewish Königsberg. Opened on 18 September 2022, on the 2nd floor of the building.', // src: JM-info, JM-first, 2GIS-mus
    },
    address: ADDRESS,
    phones: ['+7 921 008-25-00'], // src: JM-info, VK-mus, 2GIS-mus, YM
    email: 'visitor@jmkaliningrad.org', // src: JM-info
    hours: {
      ru: 'Вс–Чт 11:00–17:00; Пт 11:00–17:00 (лето) / 11:00–15:00 (зима); Сб — выходной', // src: JM-info
      en: 'Sun–Thu 11:00–17:00; Fri 11:00–17:00 (summer) / 11:00–15:00 (winter); Sat closed', // src: JM-info
    },
  },
  {
    title: {
      ru: 'Экскурсионный отдел',
      en: 'Excursion office',
      he: 'מחלקת סיורים',
    }, // src: OF-tour
    description: {
      ru: 'Осмотр синагоги возможен каждый день, кроме субботы, в составе организованной экскурсии. Индивидуальные экскурсии — по звонку в экскурсионный отдел.', // src: OF-tour
      en: 'The synagogue can be visited every day except Saturday as part of a guided tour. Private tours — call the excursion office.', // src: OF-tour
    },
    address: ADDRESS,
    phones: ['+7 909 791-81-78'], // src: OF-tour, TL-guide
    email: null,
    hours: {
      ru: 'Ежедневно, кроме субботы', // src: OF-tour
      en: 'Daily except Saturday', // src: OF-tour
    },
  },
  {
    title: { ru: 'Миква', en: 'Mikvah', he: 'מקווה' }, // src: FEOR, GOTOV-130
    description: {
      ru: 'При общине есть мужская и женская миквы. Порядок записи уточняйте в общине.', // src: FEOR
      en: "The community has men's and women's mikvahs. Ask the community how to book.", // src: FEOR
    },
    address: { ru: '[ВПИШИ: адрес миквы]' },
    phones: [],
    email: null,
    hours: { ru: '[ВПИШИ: часы и порядок записи в микву]' },
  },
];

export interface SeedNews {
  title: LocalizedString;
  lead: LocalizedString;
  body: LocalizedString;
  publishedAt: string;
  /** Обложка — одно из уже засеянных Commons-фото альбомов (файл из `seed-assets/photos`); атрибуция дописывается в текст. */
  coverPhoto: string;
}

export const NEWS: SeedNews[] = [
  {
    // источник — GOTOV-130
    title: {
      ru: 'Синагога отпраздновала 130-летний юбилей',
      en: 'The synagogue celebrated its 130th anniversary',
    },
    lead: {
      ru: '31 августа 2026 года община отметила 130 лет Новой синагоги Кёнигсберга.', // src: GOTOV-130
    },
    body: {
      ru: [
        '31 августа 2026 года в синагоге прошёл праздник 130-летия. С приветственными словами выступили главный раввин Калининграда и Калининградской области Давид Шведик и Л. Плитман; гостям зачитали письмо главного раввина России Берла Лазара.', // src: GOTOV-130, OF-home
        '«Великолепная миква, молодежный клуб, гарантирующий преемственность поколений, кошерный ресторан и музей, бережно хранящий наследие, – все это превращает синагогу в маяк света, милосердия и святости для каждого еврея города и для многочисленных гостей, посещающих этот край». — Берл Лазар', // src: GOTOV-130
        'Источник: https://gotov.org/news/kaliningradskaya-sinagoga-otprazdnovala-130-letniy-yubiley', // src: GOTOV-130
      ].join('\n\n'),
    },
    publishedAt: '2026-08-31T12:00:00Z', // src: GOTOV-130
    coverPhoto: 'commons_Синагога_Калининград_.jpg',
  },
  {
    // источники — OLD-n22, WIKI, RIA, MJCC
    title: {
      ru: 'Открытие синагоги 8 ноября 2018 года',
      en: 'Opening of the synagogue on 8 November 2018',
    },
    lead: {
      ru: 'Синагога открылась 8 ноября 2018 года — к 80-летию Хрустальной ночи.', // src: OLD-n22, WIKI, RIA
    },
    body: {
      ru: [
        'Церемония открытия прошла 8 ноября 2018 года и была приурочена к 80-летию Хрустальной ночи. Она включала внесение свитка Торы и памятные мероприятия.', // src: OLD-n22, RIA
        'На открытии были главный раввин России Берл Лазар, президент ФЕОР Александр Борода, меценат Владимир Кацман, посол Германии Рюдигер фон Фрич, посол Израиля Гарри Корен, представитель МИД Германии Михаэль Рот и свидетельница Хрустальной ночи Нехама Дробер.', // src: RIA, MJCC
        '«Мы всегда хотели, чтобы на месте сгоревшей синагоги появился новый храм. […] И то, что она восстановлена, говорит о том, что народ Израиля жив и нацисты не достигли своей цели». — раввин Давид Шведик', // src: SVOB
      ].join('\n\n'),
    },
    publishedAt: '2018-11-08T12:00:00Z', // src: OLD-n22, WIKI
    coverPhoto: 'commons_Kaliningrad_New_Synagogue_Aug_2018.jpg',
  },
];

export interface SeedPhoto {
  /** Имя файла в `backend/seed-assets/photos/`; лицензия и автор — из `_sources.txt`. */
  file: string;
  caption: LocalizedString;
}

export interface SeedAlbum {
  title: LocalizedString;
  photos: SeedPhoto[];
}

/**
 * `commons_*` — Wikimedia Commons со свободной лицензией; `community_*` — архив общины (фото, переданные общиной
 * для сайта, Яндекс Диск «для сайта»). Подписи — по описаниям в `_sources.txt`.
 */
export const ALBUMS: SeedAlbum[] = [
  {
    title: {
      ru: 'Здание синагоги',
      en: 'The synagogue building',
      he: 'בניין בית הכנסת',
    },
    photos: [
      {
        file: 'commons_Синагога_Калининград_.jpg',
        caption: {
          ru: 'Синагога ночью, отражение в Преголе',
          en: 'The synagogue at night, reflected in the Pregolya',
        },
      },
      {
        file: 'commons_Kaliningrad_Synagoge_1.jpg',
        caption: {
          ru: 'Восстановленная синагога, 2019',
          en: 'The rebuilt synagogue, 2019',
        },
      },
      {
        file: 'commons_Синагога_32895_.jpg',
        caption: {
          ru: 'Фронтальный вид на синагогу',
          en: 'Front view of the synagogue',
        },
      },
      {
        file: 'commons_Kaliningrad_-_Synagogue_view_from_water.jpg',
        caption: {
          ru: 'Вид на синагогу с воды, 2021',
          en: 'View from the water, 2021',
        },
      },
      {
        file: 'commons_Kaliningrad_Synagoge_2.jpg',
        caption: {
          ru: 'Восстановленная синагога, 2019',
          en: 'The rebuilt synagogue, 2019',
        },
      },
      {
        file: 'commons_Синагога_в_Калининграде.jpg',
        caption: {
          ru: 'Синагога в вечерней подсветке',
          en: 'The synagogue lit up in the evening',
        },
      },
      {
        file: 'commons_Kaliningrad_Synagoge_Fischerdorf_1.jpg',
        caption: {
          ru: 'Синагога и Рыбная деревня',
          en: 'The synagogue and the Fishing Village',
        },
      },
      {
        file: 'commons_Здание_сиротского_еврейского_приюта_и_еврейская_синагога_-_Калининград_-_2025г.jpg',
        caption: {
          ru: 'Здание еврейского сиротского приюта и синагога, зима 2025',
          en: 'The Jewish orphanage building and the synagogue, winter 2025',
        },
      },
      {
        file: 'commons_IMG_Kaliningrad_-_New_Synagogue_in_Königsberg_-_2024-06-11_-_p2.jpg',
        caption: { ru: 'Вечерний вид, 2024', en: 'Evening view, 2024' },
      },
      {
        file: 'commons_Kaliningrad_by_Darafsh_13_47_12_881000.jpeg',
        caption: { ru: 'Купол синагоги', en: 'The dome' },
      },
    ],
  },
  {
    title: {
      ru: 'Новая синагога Кёнигсберга, 1896–1938',
      en: 'The New Synagogue of Königsberg, 1896–1938',
      he: 'בית הכנסת החדש של קניגסברג, 1896–1938',
    },
    photos: [
      {
        file: 'commons_Königsberg._Neue_Synagoge_-01.jpg',
        caption: {
          ru: 'Новая синагога в Кёнигсберге, около 1900',
          en: 'The New Synagogue in Königsberg, c. 1900',
        },
      },
      {
        file: 'commons_Syna_Konigsberg_-2a-W.jpg',
        caption: {
          ru: 'Новая синагога Кёнигсберга, 1925',
          en: 'The New Synagogue of Königsberg, 1925',
        },
      },
      {
        file: 'commons_Synagogen_Innenraum.jpg',
        caption: {
          ru: 'Интерьер Новой синагоги Кёнигсберга',
          en: 'Interior of the New Synagogue of Königsberg',
        },
      },
      {
        file: 'commons_HonigbrNeuSynagoge.jpg',
        caption: {
          ru: 'Медовый мост и синагога',
          en: 'The Honey Bridge and the synagogue',
        },
      },
      {
        file: 'commons_Königsberg._Neue_Synagoge_-08.jpg',
        caption: {
          ru: 'Новая синагога в Кёнигсберге, 1909',
          en: 'The New Synagogue in Königsberg, 1909',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Строительство 2012–2018',
      en: 'Construction 2012–2018',
      he: 'הבנייה 2012–2018',
    },
    photos: [
      {
        file: 'commons_Kenigsberg-place_of_synagogue_1a.jpg',
        caption: {
          ru: 'Памятный камень на месте разрушенной синагоги, 2012',
          en: 'Memorial stone on the site of the destroyed synagogue, 2012',
        },
      },
      {
        file: 'commons_Konigsberg_Synagogue_Construction_Site.jpg',
        caption: {
          ru: 'Строительная площадка, август 2016',
          en: 'Construction site, August 2016',
        },
      },
      {
        file: 'commons_New_Koenigsberg_Synagogue_construction_progress_10th._December_2017.jpg',
        caption: {
          ru: 'Ход строительства, декабрь 2017',
          en: 'Construction progress, December 2017',
        },
      },
      {
        file: 'commons_Kaliningrad_New_Synagogue_Aug_2018.jpg',
        caption: {
          ru: 'Синагога в августе 2018',
          en: 'The synagogue in August 2018',
        },
      },
      {
        file: 'commons_Rekonstruierte_neue_Synagoge_Kaliningrad_am_Vorabend_der_Eröffnung.jpg',
        caption: {
          ru: 'Накануне открытия, 7 ноября 2018',
          en: 'On the eve of the opening, 7 November 2018',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Молельный зал',
      en: 'The prayer hall',
      he: 'אולם התפילה',
    },
    photos: [
      {
        file: 'community_hall_01.jpg',
        caption: {
          ru: 'Витраж-роза со звездой Давида',
          en: 'The rose window with the Star of David',
          he: 'חלון הוורד עם מגן דוד',
        },
      },
      {
        file: 'community_hall_02.jpg',
        caption: {
          ru: 'Молельный зал и витраж-роза',
          en: 'The prayer hall and the rose window',
          he: 'אולם התפילה וחלון הוורד',
        },
      },
      {
        file: 'community_hall_03.jpg',
        caption: {
          ru: 'Арон а-кодеш и витраж-роза',
          en: 'The Holy Ark and the rose window',
          he: 'ארון הקודש וחלון הוורד',
        },
      },
      {
        file: 'community_hall_04.jpg',
        caption: {
          ru: 'Арон а-кодеш с парохетом',
          en: 'The Holy Ark with the parochet',
          he: 'ארון הקודש והפרוכת',
        },
      },
      {
        file: 'community_hall_05.jpg',
        caption: {
          ru: 'Вид на зал с галереи',
          en: 'The hall seen from the gallery',
          he: 'האולם מהעזרה',
        },
      },
      {
        file: 'community_hall_06.jpg',
        caption: {
          ru: 'Тора с переводом на русский',
          en: 'A Chumash with Russian translation',
          he: 'חומש עם תרגום לרוסית',
        },
      },
      {
        file: 'community_hall_07.jpg',
        caption: {
          ru: 'Светильник в молельном зале',
          en: 'A lamp in the prayer hall',
          he: 'מנורה באולם התפילה',
        },
      },
      {
        file: 'community_hall_08.jpg',
        caption: {
          ru: 'Витраж-роза вечером',
          en: 'The rose window in the evening',
          he: 'חלון הוורד בערב',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Молитва',
      en: 'Prayer',
      he: 'תפילה',
    },
    photos: [
      {
        file: 'community_prayer_01.jpg',
        caption: {
          ru: 'Молитва в талите и тфилине',
          en: 'Praying in tallit and tefillin',
          he: 'תפילה בטלית ותפילין',
        },
      },
      {
        file: 'community_prayer_02.jpg',
        caption: {
          ru: 'Утренняя молитва',
          en: 'Morning prayer',
          he: 'תפילת שחרית',
        },
      },
      {
        file: 'community_prayer_03.jpg',
        caption: {
          ru: 'Чтение молитвенника',
          en: 'Reading the siddur',
          he: 'קריאה בסידור',
        },
      },
      {
        file: 'community_prayer_04.jpg',
        caption: {
          ru: 'Молитва в зале',
          en: 'Prayer in the hall',
          he: 'תפילה באולם',
        },
      },
      {
        file: 'community_prayer_05.jpg',
        caption: {
          ru: 'Молитва стоя',
          en: 'Standing in prayer',
          he: 'תפילה בעמידה',
        },
      },
      {
        file: 'community_prayer_06.jpg',
        caption: {
          ru: 'Молитва у витража',
          en: 'Prayer by the window',
          he: 'תפילה ליד החלון',
        },
      },
      {
        file: 'community_prayer_07.jpg',
        caption: {
          ru: 'Сосредоточенная молитва',
          en: 'Deep in prayer',
          he: 'שקוע בתפילה',
        },
      },
      {
        file: 'community_prayer_08.jpg',
        caption: {
          ru: 'Талит и тфилин',
          en: 'Tallit and tefillin',
          he: 'טלית ותפילין',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Праздники в общине',
      en: 'Holidays in the community',
      he: 'חגים בקהילה',
    },
    photos: [
      {
        file: 'community_holidays_01.jpg',
        caption: {
          ru: 'Праздник с новым свитком Торы',
          en: 'Celebrating a new Torah scroll',
          he: 'חגיגה עם ספר תורה חדש',
        },
      },
      {
        file: 'community_holidays_02.jpg',
        caption: {
          ru: 'Танцы со свитком Торы',
          en: 'Dancing with the Torah',
          he: 'ריקודים עם ספר התורה',
        },
      },
      {
        file: 'community_holidays_03.jpg',
        caption: {
          ru: 'Написание свитка Торы',
          en: 'Writing a Torah scroll',
          he: 'כתיבת ספר תורה',
        },
      },
      {
        file: 'community_holidays_04.jpg',
        caption: {
          ru: 'Поднятие свитка Торы',
          en: 'Raising the Torah scroll',
          he: 'הגבהת ספר התורה',
        },
      },
      {
        file: 'community_holidays_05.jpg',
        caption: {
          ru: 'Ханука у синагоги',
          en: 'Chanukah outside the synagogue',
          he: 'חנוכה ליד בית הכנסת',
        },
      },
      {
        file: 'community_holidays_06.jpg',
        caption: {
          ru: 'Зажигание ханукальных свечей',
          en: 'Lighting the Chanukah candles',
          he: 'הדלקת נרות חנוכה',
        },
      },
      {
        file: 'community_holidays_07.jpg',
        caption: {
          ru: 'Ханукальный вечер',
          en: 'A Chanukah evening',
          he: 'ערב חנוכה',
        },
      },
      {
        file: 'community_holidays_08.jpg',
        caption: {
          ru: '«С праздником Хануки!»',
          en: '“Happy Chanukah!”',
          he: '„חנוכה שמח!”',
        },
      },
      {
        file: 'community_holidays_09.jpg',
        caption: {
          ru: 'Праздничный вечер в зале',
          en: 'A festive evening in the hall',
          he: 'ערב חגיגי באולם',
        },
      },
      {
        file: 'community_holidays_10.jpg',
        caption: {
          ru: 'Праздничная трапеза',
          en: 'A festive meal',
          he: 'סעודה חגיגית',
        },
      },
      {
        file: 'community_holidays_11.jpg',
        caption: {
          ru: 'Трапеза для старшего поколения',
          en: 'A meal for the older generation',
          he: 'סעודה לבני הגיל השלישי',
        },
      },
      {
        file: 'community_holidays_12.jpg',
        caption: {
          ru: 'Пурим: костюмы и веселье',
          en: 'Purim costumes and fun',
          he: 'פורים: תחפושות ושמחה',
        },
      },
      {
        file: 'community_holidays_13.jpg',
        caption: {
          ru: 'Праздник детей',
          en: 'A children’s celebration',
          he: 'חגיגת ילדים',
        },
      },
      {
        file: 'community_holidays_14.jpg',
        caption: {
          ru: 'Праздник в синагоге',
          en: 'A celebration in the synagogue',
          he: 'חגיגה בבית הכנסת',
        },
      },
      {
        file: 'community_holidays_15.jpg',
        caption: {
          ru: 'Детский клуб «Код лета»',
          en: 'The “Code of Summer” kids’ club',
          he: 'מועדון הילדים „קוד הקיץ”',
        },
      },
      {
        file: 'community_holidays_16.jpg',
        caption: {
          ru: 'Торжественное открытие',
          en: 'A ribbon-cutting ceremony',
          he: 'טקס גזירת סרט',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Концерты в синагоге',
      en: 'Concerts in the synagogue',
      he: 'קונצרטים בבית הכנסת',
    },
    photos: [
      {
        file: 'community_concerts_01.jpg',
        caption: {
          ru: 'Концерт в молельном зале',
          en: 'A concert in the prayer hall',
          he: 'קונצרט באולם התפילה',
        },
      },
      {
        file: 'community_concerts_02.jpg',
        caption: {
          ru: 'Зрители концерта',
          en: 'The audience',
          he: 'הקהל',
        },
      },
      {
        file: 'community_concerts_03.jpg',
        caption: {
          ru: 'Ансамбль под руководством Фельдмана',
          en: 'The ensemble led by Feldman',
          he: 'ההרכב בניהולו של פלדמן',
        },
      },
      {
        file: 'community_concerts_04.jpg',
        caption: {
          ru: 'Скрипки ансамбля',
          en: 'The ensemble’s violins',
          he: 'כינורות ההרכב',
        },
      },
      {
        file: 'community_concerts_05.jpg',
        caption: {
          ru: 'Концерт с кантором',
          en: 'A concert with a cantor',
          he: 'קונצרט עם חזן',
        },
      },
      {
        file: 'community_concerts_06.jpg',
        caption: {
          ru: 'Публика концерта с кантором',
          en: 'The audience at the cantor’s concert',
          he: 'הקהל בקונצרט החזן',
        },
      },
      {
        file: 'community_concerts_07.jpg',
        caption: {
          ru: 'Оркестр и кантор',
          en: 'The orchestra and the cantor',
          he: 'התזמורת והחזן',
        },
      },
      {
        file: 'community_concerts_08.jpg',
        caption: {
          ru: 'Поёт кантор',
          en: 'The cantor sings',
          he: 'החזן שר',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Еврейский музей',
      en: 'The Jewish Museum',
      he: 'המוזיאון היהודי',
    },
    photos: [
      {
        file: 'community_museum_01.jpg',
        caption: {
          ru: 'Экспозиция Еврейского музея',
          en: 'The Jewish Museum exhibition',
          he: 'תערוכת המוזיאון היהודי',
        },
      },
      {
        file: 'community_museum_02.jpg',
        caption: {
          ru: 'Стенды об истории общины',
          en: 'Panels on the history of the community',
          he: 'לוחות על תולדות הקהילה',
        },
      },
      {
        file: 'community_museum_03.jpg',
        caption: {
          ru: 'Выставочный зал',
          en: 'The exhibition room',
          he: 'חדר התצוגה',
        },
      },
      {
        file: 'community_museum_04.jpg',
        caption: {
          ru: 'Выставка живописи',
          en: 'A painting exhibition',
          he: 'תערוכת ציורים',
        },
      },
      {
        file: 'community_museum_05.jpg',
        caption: {
          ru: 'Галерея музея',
          en: 'The museum gallery',
          he: 'גלריית המוזיאון',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Миквы',
      en: 'The mikvahs',
      he: 'המקוואות',
    },
    photos: [
      {
        file: 'community_mikvah_01.jpg',
        caption: {
          ru: 'Женская миква',
          en: 'The women’s mikvah',
          he: 'מקווה הנשים',
        },
      },
      {
        file: 'community_mikvah_02.jpg',
        caption: {
          ru: 'Женская миква: комната подготовки',
          en: 'The women’s mikvah: preparation room',
          he: 'מקווה הנשים: חדר ההכנה',
        },
      },
      {
        file: 'community_mikvah_03.jpg',
        caption: {
          ru: 'Женская миква: комната ожидания',
          en: 'The women’s mikvah: waiting room',
          he: 'מקווה הנשים: חדר ההמתנה',
        },
      },
      {
        file: 'community_mikvah_04.jpg',
        caption: {
          ru: 'Мужская миква',
          en: 'The men’s mikvah',
          he: 'מקווה הגברים',
        },
      },
      {
        file: 'community_mikvah_05.jpg',
        caption: {
          ru: 'Бассейн мужской миквы',
          en: 'The men’s mikvah pool',
          he: 'בריכת מקווה הגברים',
        },
      },
      {
        file: 'community_mikvah_06.jpg',
        caption: {
          ru: 'Комната отдыха',
          en: 'The lounge',
          he: 'חדר המנוחה',
        },
      },
    ],
  },
  {
    title: {
      ru: 'Еврейское кладбище',
      en: 'The Jewish cemetery',
      he: 'בית הקברות היהודי',
    },
    photos: [
      {
        file: 'community_cemetery_01.jpg',
        caption: {
          ru: 'Еврейское кладбище',
          en: 'The Jewish cemetery',
          he: 'בית הקברות היהודי',
        },
      },
      {
        file: 'community_cemetery_02.jpg',
        caption: {
          ru: 'Памятный камень к 150-летию освящения кладбища',
          en: 'Memorial stone for the cemetery’s 150th anniversary',
          he: 'אבן זיכרון במלאת 150 שנה לבית הקברות',
        },
      },
      {
        file: 'community_cemetery_03.jpg',
        caption: {
          ru: 'Открытие памятного камня',
          en: 'Unveiling the memorial stone',
          he: 'חשיפת אבן הזיכרון',
        },
      },
      {
        file: 'community_cemetery_04.jpg',
        caption: {
          ru: 'Старые надгробия',
          en: 'Old gravestones',
          he: 'מצבות עתיקות',
        },
      },
      {
        file: 'community_cemetery_05.jpg',
        caption: {
          ru: 'День памяти на кладбище',
          en: 'A day of remembrance at the cemetery',
          he: 'יום זיכרון בבית הקברות',
        },
      },
      {
        file: 'community_cemetery_06.jpg',
        caption: {
          ru: 'Мемориальная стена',
          en: 'The memorial wall',
          he: 'קיר הזיכרון',
        },
      },
      {
        file: 'community_cemetery_07.jpg',
        caption: {
          ru: 'Траурное собрание',
          en: 'A memorial gathering',
          he: 'עצרת זיכרון',
        },
      },
    ],
  },
];

/** Значения настроек, если ключа ещё нет (правки редактора не затираются). */
export const SETTINGS: Record<string, unknown> = {
  supporters_offset: 0,
  kaddish_month_rub: null, // тариф не найден — фронт показывает заглушку
  requisites: { ru: '[ВПИШИ: реквизиты для перевода пожертвований]' }, // актуальные реквизиты в источниках НЕ НАЙДЕНЫ
  operator: {
    ru: '[ВПИШИ: оператор персональных данных — наименование, ИНН, адрес]',
  },
  socials: [
    { name: 'Telegram', url: 'https://t.me/B_C_Kaliningrad' }, // src: TG — канал «Бейт Хабад Калининград»
    { name: 'VK', url: 'https://vk.com/jewish39' }, // src: FEOR
  ],
  header_phones: ['+7 (4012) 46-43-45'], // src: OF-home, OF-cont, FEOR
};
