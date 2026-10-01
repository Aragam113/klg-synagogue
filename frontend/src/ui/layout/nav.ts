/** Main menu: Общине / Туристам / Расписание / Афиша / Новости / Поддержать. Labels: common:nav.<key>. */
export const MAIN_NAV = [
  { key: 'community', href: '/community' },
  { key: 'visit', href: '/visit' },
  { key: 'schedule', href: '/schedule' },
  { key: 'events', href: '/events' },
  { key: 'news', href: '/news' },
  { key: 'donate', href: '/donate' },
] as const;

/** Footer columns. Labels: common:footer.<col> and common:links.<key>. */
export const FOOTER_COLUMNS = [
  {
    key: 'colCommunity',
    links: [
      { key: 'community', href: '/community' },
      { key: 'programs', href: '/programs' },
      { key: 'departments', href: '/departments' },
      { key: 'askRabbi', href: '/ask-rabbi' },
      { key: 'appointment', href: '/appointment' },
    ],
  },
  {
    key: 'colVisit',
    links: [
      { key: 'visit', href: '/visit' },
      { key: 'excursions', href: '/visit/excursions/book' },
      { key: 'history', href: '/history' },
      { key: 'about', href: '/about' },
      { key: 'contacts', href: '/contacts' },
    ],
  },
  {
    key: 'colLife',
    links: [
      { key: 'schedule', href: '/schedule' },
      { key: 'events', href: '/events' },
      { key: 'news', href: '/news' },
      { key: 'gallery', href: '/gallery' },
    ],
  },
  {
    key: 'colSupport',
    links: [
      { key: 'donate', href: '/donate' },
      { key: 'help', href: '/help' },
      { key: 'volunteer', href: '/volunteer' },
    ],
  },
] as const;

export const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);
