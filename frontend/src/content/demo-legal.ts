import type { LegalDoc } from './types';

const copy = {
  ru: {
    updated: 'Демонстрационная версия · 16 ноября 2026',
    privacy: [
      [
        'Данные в демо',
        'Демо работает как статический сайт. Формы, подписки и платежи отключены: введённые в поля сведения не отправляются через эти формы и не сохраняются сайтом. Не вводите реальные персональные данные.',
      ],
      [
        'Настройки и посещение сайта',
        'Язык интерфейса и выбор настроек могут сохраняться в локальном хранилище вашего браузера. Хостинг получает обычные технические сведения о запросах, например IP-адрес и адрес открытой страницы.',
      ],
      [
        'Внешние сервисы',
        'Ссылки на Telegram, карты и другие сайты открывают сторонние сервисы с собственными правилами обработки данных. Для связи с общиной воспользуйтесь разделом «Контакты».',
      ],
    ],
    consent: [
      [
        'Отправка данных отключена',
        'В этой демонстрационной версии согласие не запрашивается и не оформляется: заявки, подписки и платежи через сайт не отправляются. Поля и флажки показывают будущий интерфейс.',
      ],
      [
        'Перед рабочим запуском',
        'Текст согласия и политика должны быть согласованы с оператором сайта до включения отправки данных. Сейчас для обращения используйте контакты общины.',
      ],
    ],
  },
  en: {
    updated: 'Demonstration version · 16 November 2026',
    privacy: [
      [
        'Data in the demo',
        'The demo is a static website. Forms, subscriptions and payments are disabled: information entered in these fields is not submitted through the forms or saved by the site. Please do not enter real personal data.',
      ],
      [
        'Preferences and site visits',
        'Your language and preferences may be kept in your browser’s local storage. The hosting service receives ordinary technical request information, such as your IP address and the page you open.',
      ],
      [
        'External services',
        'Links to Telegram, maps and other websites open third-party services with their own privacy policies. To reach the community, use the Contacts page.',
      ],
    ],
    consent: [
      [
        'Submission is disabled',
        'This demo does not request or record consent: requests, subscriptions and payments cannot be submitted through the site. Fields and checkboxes preview the future interface.',
      ],
      [
        'Before the live launch',
        'The consent text and privacy policy must be agreed with the site operator before data submission is enabled. For now, please use the community’s contact details.',
      ],
    ],
  },
  he: {
    updated: 'גרסת הדגמה · 16 בנובמבר 2026',
    privacy: [
      [
        'נתונים בגרסת ההדגמה',
        'זהו אתר סטטי. הטפסים, ההרשמות והתשלומים מושבתים: מידע שמוקלד בשדות אינו נשלח דרך הטפסים ואינו נשמר באתר. אין להזין פרטים אישיים אמיתיים.',
      ],
      [
        'העדפות וביקור באתר',
        'שפת הממשק וההעדפות עשויות להישמר באחסון המקומי של הדפדפן. שירות האחסון מקבל מידע טכני רגיל על הבקשות, כגון כתובת IP וכתובת העמוד שנפתח.',
      ],
      [
        'שירותים חיצוניים',
        'קישורים לטלגרם, למפות ולאתרים אחרים מובילים לשירותים חיצוניים עם מדיניות פרטיות משלהם. לפנייה לקהילה יש להשתמש בעמוד פרטי הקשר.',
      ],
    ],
    consent: [
      [
        'שליחת נתונים מושבתת',
        'בגרסת הדגמה זו לא מתבקשת ולא נרשמת הסכמה: אי אפשר לשלוח בקשות, הרשמות ותשלומים דרך האתר. השדות ותיבות הסימון מציגים את הממשק העתידי.',
      ],
      [
        'לפני הפעלת האתר המלא',
        'יש לאשר את נוסח ההסכמה ואת מדיניות הפרטיות עם מפעיל האתר לפני הפעלת שליחת הנתונים. בינתיים יש לפנות לקהילה באמצעות פרטי הקשר.',
      ],
    ],
  },
};

/** Demo-specific text; does not make promises about an unconfigured live service. */
export const demoLegal = (
  lang: 'ru' | 'en' | 'he',
  kind: 'privacy' | 'consent',
  title: string
): LegalDoc => ({
  title,
  updated: copy[lang].updated,
  sections: copy[lang][kind].map(([heading, text]) => ({ title: heading, paragraphs: [text] })),
});
