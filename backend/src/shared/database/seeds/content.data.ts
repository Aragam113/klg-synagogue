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

/** Только `commons_*` со свободной лицензией; подписи — по описаниям в `_sources.txt`. */
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
];

/** Значения настроек, если ключа ещё нет (правки редактора не затираются). */
export const SETTINGS: Record<string, unknown> = {
  supporters_offset: 0,
  kaddish_month_rub: null, // тариф не найден — фронт показывает заглушку
  requisites: { ru: '[ВПИШИ: реквизиты для перевода пожертвований]' }, // актуальные реквизиты в источниках НЕ НАЙДЕНЫ
  operator: {
    ru: '[ВПИШИ: оператор персональных данных — наименование, ИНН, адрес]',
  },
  socials: [{ name: 'VK', url: 'https://vk.com/jewish39' }], // src: FEOR
  header_phones: ['+7 (4012) 46-43-45'], // src: OF-home, OF-cont, FEOR
};
