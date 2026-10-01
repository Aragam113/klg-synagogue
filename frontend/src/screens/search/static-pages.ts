/**
 * Заголовки статических страниц для поиска по сайту (`/search`): их ищет фронт,
 * динамический контент — бэкенд (`GET /search`). Статические разделы перечислены
 * в этом массиве (path + заголовок на трёх языках + необязательные ключевые слова).
 */
export interface StaticPage {
  path: string;
  title: { ru: string; en: string; he: string };
  keywords?: { ru?: string; en?: string; he?: string };
}

export const staticPages: StaticPage[] = [
  {
    path: '/news',
    title: { ru: 'Новости и анонсы', en: 'News and announcements', he: 'חדשות והודעות' },
  },
  { path: '/events', title: { ru: 'Афиша событий', en: 'Events', he: 'אירועים' } },
  {
    path: '/gallery',
    title: { ru: 'Галерея', en: 'Gallery', he: 'גלריה' },
    keywords: { ru: 'фото альбомы', en: 'photos albums', he: 'תמונות' },
  },
  {
    path: '/programs',
    title: { ru: 'Программы общины', en: 'Community programs', he: 'תוכניות הקהילה' },
    keywords: { ru: 'уроки занятия', en: 'classes lessons', he: 'שיעורים' },
  },
  {
    path: '/departments',
    title: { ru: 'Подразделения и услуги', en: 'Departments and services', he: 'מחלקות ושירותים' },
    keywords: {
      ru: 'кошерная столовая музей миква',
      en: 'kosher museum mikvah',
      he: 'כשר מוזיאון מקווה',
    },
  },
  {
    path: '/schedule',
    title: { ru: 'Расписание молитв', en: 'Prayer schedule', he: 'זמני תפילה' },
    keywords: { ru: 'шаббат свечи зманим', en: 'shabbat candles zmanim', he: 'שבת נרות זמנים' },
  },
  // Статические разделы («Общине», «Туристам», история, контакты…)
  {
    path: '/community',
    title: { ru: 'Общине', en: 'Community', he: 'לקהילה' },
    keywords: {
      ru: 'жизнь общины колель уроки помощь',
      en: 'community life kollel help',
      he: 'חיי קהילה כולל עזרה',
    },
  },
  {
    path: '/visit',
    title: { ru: 'Туристам', en: 'Visitors', he: 'למבקרים' },
    keywords: { ru: 'посещение туристы', en: 'visit tourists', he: 'ביקור תיירים' },
  },
  {
    path: '/visit/hours',
    title: { ru: 'Часы работы', en: 'Opening hours', he: 'שעות פתיחה' },
    keywords: { ru: 'режим время открыто', en: 'open time schedule', he: 'פתוח' },
  },
  {
    path: '/visit/how-to-get',
    title: { ru: 'Как добраться', en: 'Getting here', he: 'איך מגיעים' },
    keywords: {
      ru: 'адрес карта автобус трамвай рыбная деревня',
      en: 'address map bus tram directions',
      he: 'כתובת מפה אוטובוס',
    },
  },
  {
    path: '/visit/rules',
    title: { ru: 'Правила посещения', en: 'Visitor rules', he: 'כללי ביקור' },
    keywords: { ru: 'одежда фото кипа', en: 'dress code photo kippah', he: 'לבוש צילום כיפה' },
  },
  {
    path: '/visit/excursions',
    title: { ru: 'Экскурсии в синагогу', en: 'Synagogue tours', he: 'סיורים בבית הכנסת' },
    keywords: {
      ru: 'экскурсия билеты цены',
      en: 'tour excursion tickets prices',
      he: 'סיור כרטיסים מחירים',
    },
  },
  {
    path: '/visit/museum',
    title: {
      ru: 'Музей «Новая синагога»',
      en: 'New Synagogue Museum',
      he: 'מוזיאון בית הכנסת החדש',
    },
    keywords: { ru: 'музей выставка', en: 'museum exhibition', he: 'מוזיאון תערוכה' },
  },
  {
    path: '/visit/kosher',
    title: { ru: 'Кошерное питание', en: 'Kosher food', he: 'אוכל כשר' },
    keywords: {
      ru: 'кошерная столовая кашрут',
      en: 'kosher canteen kashrut',
      he: 'מזנון כשר כשרות',
    },
  },
  {
    path: '/history',
    title: { ru: 'История синагоги', en: 'History of the synagogue', he: 'היסטוריה של בית הכנסת' },
    keywords: {
      ru: 'кёнигсберг хрустальная ночь 1896 2018',
      en: 'konigsberg kristallnacht 1896 2018',
      he: 'קניגסברג ליל הבדולח',
    },
  },
  {
    path: '/about',
    title: { ru: 'Об общине', en: 'About the community', he: 'על הקהילה' },
    keywords: {
      ru: 'раввин руководство шведик',
      en: 'rabbi leadership shvedik',
      he: 'רב הנהלה שבדיק',
    },
  },
  {
    path: '/contacts',
    title: { ru: 'Контакты', en: 'Contacts', he: 'צור קשר' },
    keywords: { ru: 'телефон адрес email', en: 'phone address email', he: 'טלפון כתובת' },
  },
  {
    path: '/privacy',
    title: { ru: 'Политика конфиденциальности', en: 'Privacy policy', he: 'מדיניות פרטיות' },
    keywords: { ru: 'персональные данные', en: 'personal data', he: 'נתונים אישיים' },
  },
  {
    path: '/consent',
    title: {
      ru: 'Согласие на обработку персональных данных',
      en: 'Consent to data processing',
      he: 'הסכמה לעיבוד נתונים',
    },
  },
];

type Lang = keyof StaticPage['title'];
const asLang = (lang: string): Lang => (lang === 'en' || lang === 'he' ? lang : 'ru');

/** Страницы, в заголовке или ключевых словах которых есть запрос (≥ 2 символов). */
export const matchStaticPages = (q: string, lang: string): { path: string; title: string }[] => {
  const needle = q.trim().toLocaleLowerCase();
  if (needle.length < 2) return [];
  const l = asLang(lang);
  return staticPages
    .filter((p) => `${p.title[l]} ${p.keywords?.[l] ?? ''}`.toLocaleLowerCase().includes(needle))
    .map((p) => ({ path: p.path, title: p.title[l] }));
};
