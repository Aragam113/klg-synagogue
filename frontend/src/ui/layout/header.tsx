import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';

import { telHref } from '@/config/site';
import { useLang } from '@/i18n/use-lang';
import { MagenDavid } from '@/ui/judaica/magen-david';
import { Link } from '@/ui/kit/link';
import { lockScroll } from '@/ui/motion/engine';

import { LangSwitch } from './lang-switch';
import { isActivePath, MAIN_NAV } from './nav';
import { TodayWidget } from './slots/today-widget';
import { useSiteContacts } from './slots/use-site-contacts';

export const Logo = ({ light }: { light?: boolean }) => {
  const { t } = useLang();
  return (
    <Link href="/" className={`logo${light ? ' logo--light' : ''}`} ariaLabel={t('site.full')}>
      <MagenDavid size="1.9em" strokeWidth={1.3} className="logo__mark" />
      <span className="logo__text">
        <span className="logo__name">{t('site.name')}</span>
        <span className="logo__city">{t('site.city')}</span>
      </span>
    </Link>
  );
};

const SearchIcon = () => (
  <svg
    width="1.25em"
    height="1.25em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    aria-hidden
  >
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" strokeLinecap="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg
    width="1.25em"
    height="1.25em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    aria-hidden
  >
    <path
      d="M5 4h3.5l1.6 4-2.1 1.3a11 11 0 0 0 6.7 6.7l1.3-2.1 4 1.6V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5.5 1.5 1.5 0 0 1 5 4Z"
      strokeLinejoin="round"
    />
  </svg>
);

/** Site header: logo, main menu, today slot, search, language, full-screen mobile menu. */
export const SiteHeader = () => {
  const { t } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { phone } = useSiteContacts();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="hdr">
      <Logo />
      <nav className="hdr__nav" aria-label={t('nav.main')}>
        {MAIN_NAV.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            className="hdr__link"
            ariaCurrent={isActivePath(pathname, n.href)}
          >
            {t(`nav.${n.key}`)}
          </Link>
        ))}
      </nav>
      <div className="hdr__tools">
        <div className="hdr__today">
          <TodayWidget variant="header" />
        </div>
        {/* phone from /settings/public, fallback src/config/site.ts */}
        {phone ? (
          <Link href={telHref(phone)} className="hdr__icon" ariaLabel={phone}>
            <PhoneIcon />
          </Link>
        ) : null}
        <Link href="/search" className="hdr__icon" ariaLabel={t('nav.search')}>
          <SearchIcon />
        </Link>
        <LangSwitch className="hdr__lang" />
        <button
          type="button"
          className="hdr__burger"
          aria-expanded={open}
          aria-controls="mnav"
          onClick={() => setOpen(true)}
        >
          <span className="burger" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="hdr__burger-label">{t('nav.menu')}</span>
        </button>
      </div>

      <div
        id="mnav"
        className="mnav tone-deeper"
        data-open={open}
        aria-hidden={!open}
        role="dialog"
        aria-label={t('nav.menu')}
      >
        <div className="mnav__top">
          <Logo light />
          <button type="button" className="mnav__close" onClick={() => setOpen(false)}>
            {t('nav.close')}
          </button>
        </div>
        <nav className="mnav__links">
          {MAIN_NAV.map((n, i) => (
            <Link
              key={n.key}
              href={n.href}
              className="mnav__link"
              ariaCurrent={isActivePath(pathname, n.href)}
              onClick={() => setOpen(false)}
            >
              <span className="mnav__num">{String(i + 1).padStart(2, '0')}</span>
              {t(`nav.${n.key}`)}
            </Link>
          ))}
        </nav>
        <div className="mnav__bottom">
          <TodayWidget variant="menu" />
          {phone ? (
            <Link href={telHref(phone)} className="mnav__search" onClick={() => setOpen(false)}>
              <PhoneIcon /> <span dir="ltr">{phone}</span>
            </Link>
          ) : null}
          <Link href="/search" className="mnav__search" onClick={() => setOpen(false)}>
            <SearchIcon /> {t('nav.search')}
          </Link>
          <LangSwitch className="lang--light" />
        </div>
      </div>
      {/* compact "today" bar under the header on inner pages (< 1280px) */}
      {pathname !== '/' ? <TodayWidget variant="bar" /> : null}
    </header>
  );
};
