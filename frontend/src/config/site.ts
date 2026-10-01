/**
 * Единственный источник контактов и «твёрдых» фактов о Новой синагоге Калининграда для сайта
 * (шапка, подвал, «Туристам», «Контакты», «Об общине»).
 *
 * Правило проекта: каждый телефон / e-mail / цена / часы — только из опубликованного источника,
 * URL источника — в поле `src`. Чего нет — `null`, на странице показывается видимая заглушка `[ВПИШИ: …]`.
 * Где источники расходятся — берём самый свежий/официальный, остальные варианты в `alt` + «уточняйте».
 */
import enCommon from '@/i18n/locales/en/common.json';
import heCommon from '@/i18n/locales/he/common.json';
import ruCommon from '@/i18n/locales/ru/common.json';

import { mapLinks } from './maps';

/** Источники: ключ — код из комментариев `// src:` (OF-home → ofHome), значение — URL. */
export const SRC = {
  ofHome: 'https://web.archive.org/web/20260117122132/http://kldsynagogue.com/',
  ofTour:
    'https://web.archive.org/web/20260616081640/http://kldsynagogue.com/ekskursii-i-informatsiya-dlya-turistov/',
  ofCont: 'https://web.archive.org/web/20240125230236/https://kldsynagogue.com/kontakty/',
  ofPrak: 'https://web.archive.org/web/20240125230045/https://kldsynagogue.com/praktika-iudaizma/',
  oldRoute: 'https://web.archive.org/web/20190814074255/https://kldsynagogue.com/contact',
  tlHome: 'https://web.archive.org/web/20210112020907/https://sinagoga39.tilda.ws/',
  tlComm: 'https://web.archive.org/web/20250210132321/http://sinagoga39.tilda.ws/community',
  tlGuide: 'https://web.archive.org/web/20241217010432/http://sinagoga39.tilda.ws/guide',
  tlKosher: 'https://web.archive.org/web/20241217010434/http://sinagoga39.tilda.ws/kosher',
  tlRecep: 'https://web.archive.org/web/20241217010445/http://sinagoga39.tilda.ws/reception',
  feor: 'https://feor.ru/administrative-units/kaliningrad/',
  gotov: 'https://gotov.org/organizations/evreyskaya-obshchina-kaliningrada',
  gotovKolel: 'https://gotov.org/programs/kolel-tora-dlya-zhenshchin-12',
  jmInfo: 'https://jmkaliningrad.org/%d0%b8%d0%bd%d1%84%d0%b0/',
  jmCont: 'https://jmkaliningrad.org/%d0%ba%d0%be%d0%bd%d1%82%d0%b0%d0%ba%d1%82%d1%8b/',
  jmFirst:
    'https://jmkaliningrad.org/%d0%bf%d0%b5%d1%80%d0%b2%d1%8b%d0%b5-%d0%bf%d0%be%d1%81%d0%b5%d1%82%d0%b8%d1%82%d0%b5%d0%bb%d0%b8-%d0%b4%d0%b5%d1%82%d0%b8/',
  vkSyn: 'https://visit-kaliningrad.ru/entertainment/sights/kirhi/novaya-sinagoga-kaliningrada/',
  vkMus: 'https://visit-kaliningrad.ru/entertainment/culture/museums/novaya-sinagoga/',
  gisMus: 'https://2gis.ru/kaliningrad/firm/70000001079925611',
  gisPrice: 'https://2gis.ru/kaliningrad/firm/70000001079925611/tab/prices',
  ym: 'https://yandex.com/maps/org/novaya_sinagoga/12528208587/',
  wiki: 'https://ru.wikipedia.org/wiki/Новая_синагога_(Калининград)',
  bus: 'https://ru.busti.me/kaliningrad/stop/rybnaya-derevnya/',
  mn24: 'https://muzeinayanoch39.ru/kaliningradskaya-sinagoga',
  russpass: 'https://russpass.ru/event/65fad468b3baa9b1629f7791',
  kgdFood:
    'https://kgd.ru/news/society/item/82033-v-sinagoge-na-ostrove-v-kaliningrade-otkrylas-koshernaya-stolovaya',
} as const;

export interface Fact<T> {
  value: T;
  /** URL источника. */
  src: string;
  /** Другие опубликованные варианты (источники расходятся) — показываем «уточняйте». */
  alt?: { value: T; src: string }[];
}

type L10n = { ru: string; en: string; he: string };

export const SITE = {
  /** Название сайта — единственный источник: i18n `common:site.name` (шапка, подвал, <title>). */
  name: { ru: ruCommon.site.name, en: enCommon.site.name, he: heCommon.site.name } as L10n,

  address: {
    value: {
      ru: '236006, Калининград, ул. Октябрьская, 1А',
      en: '1A Oktyabrskaya St., Kaliningrad, 236006, Russia',
      he: 'רחוב אוקטיאברסקאיה 1A, קלינינגרד, 236006, רוסיה',
    } as L10n,
    src: SRC.ofCont, // также OF-home, JM-cont
  } satisfies Fact<L10n>,

  /** Геотег статьи Википедии (здание); 2ГИС даёт точку входа музея 54.705921, 20.514934. */
  geo: { value: { lat: 54.70568333, lon: 20.51555278 }, src: SRC.wiki },

  phones: {
    community: {
      value: '+7 (4012) 46-43-45',
      src: SRC.ofHome,
      alt: [{ value: '+7 (4012) 99-41-94', src: SRC.tlHome }],
    }, // src: OF-home 2026, OF-cont, FEOR
    secretary: { value: '+7 909 777-12-30', src: SRC.tlComm }, // src: TL-home, TL-comm, TL-recep
    excursions: { value: '+7 909 791-81-78', src: SRC.ofTour }, // src: OF-tour 2026, TL-guide
    museum: { value: '+7 921 008-25-00', src: SRC.jmInfo }, // src: JM-info, VK-mus, 2GIS
    kosher: { value: '+7 909 777-12-17', src: SRC.ofHome }, // src: OF-home, TL-comm
    trustees: { value: '+7 909 777-12-17', src: SRC.ofHome }, // src: OF-home (попечительский совет)
    hesed: { value: '+7 (4012) 53-28-11', src: SRC.ofHome }, // src: OF-home
    sochnut: { value: '+7 (4012) 61-18-06', src: SRC.ofHome }, // src: OF-home
  } satisfies Record<string, Fact<string>>,

  emails: {
    community: { value: 'Kaliningrad@feor.ru', src: SRC.ofHome }, // src: OF-home, FEOR, GOTOV
    museum: { value: 'visitor@jmkaliningrad.org', src: SRC.jmInfo }, // src: JM-info
    hesed: { value: 'hesed.kaliningrad@yandex.ru', src: SRC.ofHome }, // src: OF-home
    sochnut: { value: 'ValeriyaS@jafi.org', src: SRC.ofHome }, // src: OF-home
  } satisfies Record<string, Fact<string>>,

  sites: {
    museum: { value: 'https://jmkaliningrad.org', src: SRC.jmCont },
    gotov: { value: SRC.gotov, src: SRC.gotov },
    vk: { value: 'https://vk.com/jewish39', src: SRC.feor }, // закрытое сообщество на 01.10.2026
  },

  hours: {
    /** Синагога: осмотр только в составе экскурсии, каждый день, кроме субботы. */
    synagogueClosedDay: { value: 6, src: SRC.ofTour },
    /** Сеансы экскурсий в молельный зал (офсайт, 16.06.2026); расходится с VK-syn и Tilda. */
    excursionSlots: {
      value: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      src: SRC.ofTour,
      alt: [
        { value: ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'], src: SRC.vkSyn },
        { value: ['13:00', '14:00', '15:00', '16:00'], src: SRC.tlGuide },
      ],
    },
    /** Музей (сайт музея): Вс–Чт 11–17, Пт 11–17 летом / 11–15 зимой, Сб — выходной. VK-mus: Пт 11–14. */
    museum: {
      value: { sunThu: '11:00–17:00', friSummer: '11:00–17:00', friWinter: '11:00–15:00' },
      src: SRC.jmInfo,
      alt: [
        {
          value: { sunThu: '11:00–17:00', friSummer: '11:00–14:00', friWinter: '11:00–14:00' },
          src: SRC.vkMus,
        },
      ],
    },
    /** Кошерная столовая (Tilda, снимок 17.12.2024). */
    kosher: { value: { sunThu: '10:00–18:00', fri: '10:00–16:00' }, src: SRC.tlKosher },
    /** Встреча Шаббата и утренняя молитва в Шаббат (Tilda, 10.02.2025; OF-prak 2021). */
    shabbat: { value: { kabbalat: '19:00', shacharit: '10:00' }, src: SRC.tlComm },
  },

  /** Языки экскурсии (VK-mus: «на русском, немецком и английском»); иврита в источнике нет. */
  excursionLanguages: { value: ['ru', 'de', 'en'], src: SRC.vkMus },

  /**
   * Руководство и люди общины (по источникам) — единственный источник имён:
   * «Об общине» (`content.about.people`) и формы (приёмная раввина).
   */
  people: {
    rabbi: {
      value: { ru: 'Давид Шведик', en: 'David Shvedik', he: 'דוד שבדיק' },
      src: SRC.ofHome,
    }, // src: OF-home, FEOR, GOTOV
    rabbiDeitch: {
      value: { ru: 'Авраам Борух Дайч', en: 'Avraham Boruch Deitch', he: 'אברהם ברוך דייטש' },
      src: SRC.gotov,
    }, // src: GOTOV
    rebbetzin: {
      value: { ru: 'Хая Мушка Дайч', en: 'Chaya Mushka Deitch', he: 'חיה מושקא דייטש' },
      src: SRC.gotovKolel,
    }, // src: GOTOV-kolel
    chairman: {
      value: { ru: 'Леонид Плитман', en: 'Leonid Plitman', he: 'לאוניד פליטמן' },
      src: SRC.gotov,
    }, // src: GOTOV
    trustees: {
      value: { ru: 'Владимир Кацман', en: 'Vladimir Katsman', he: 'ולדימיר קצמן' },
      src: SRC.gotov,
    }, // src: GOTOV, OLD-n23
    museumCurator: {
      value: { ru: 'Рут Лейзеровиц', en: 'Ruth Leiserowitz', he: 'רות לייזרוביץ' },
      src: SRC.jmCont,
    }, // src: JM-cont
  } satisfies Record<string, Fact<L10n>>,

  prices: {
    excursion: { value: { standard: 300, reduced: 200, couponPercent: 10 }, src: SRC.ofTour }, // src: OF-tour 16.06.2026, руб.
    /** Билеты музея: самое свежее — 2ГИС (обновлено 01.12.2025); сайт музея — 500/400. */
    museum: {
      value: { adult: 550, reduced: 450 },
      src: SRC.gisPrice,
      alt: [{ value: { adult: 500, reduced: 400 }, src: SRC.jmInfo }],
    }, // src: 2GIS-price, JM-info
    /** Яндекс Карты (обновлено 25.09.2025): комплексный билет музей + молельный зал, пешеходная экскурсия. */
    combo: { value: 700, src: SRC.ym }, // src: YM
    walkingTour: { value: 4500, src: SRC.ym }, // src: YM «Следы истории вокруг Кнайпхофа»
  },

  transport: {
    stop: {
      value: {
        ru: 'Рыбная деревня',
        en: 'Rybnaya Derevnya (Fish Village)',
        he: 'ריבניה דרבניה (כפר הדייגים)',
      } as L10n,
      src: SRC.bus,
    },
    bus: { value: ['21', '40'], src: SRC.bus },
    tram: { value: ['3', '5'], src: SRC.bus },
    minibus: { value: ['72'], src: SRC.bus },
  },

  /** Не найдено в источниках — показываем заглушки. */
  unknown: {
    parking: null,
    excursionDuration: null,
    /** Часы приёма раввина / синагоги. */
    receptionHours: null,
    telegram: null,
    operator: null,
  },
} as const;

export const MAPS = mapLinks(SITE.geo.value);

/** tel:-ссылка из публикуемого номера. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;
