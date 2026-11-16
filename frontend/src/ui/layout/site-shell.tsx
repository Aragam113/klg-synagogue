import { usePathname } from 'expo-router';
import { type ReactNode } from 'react';

import { useLang } from '@/i18n/use-lang';
import { usePressFeedback } from '@/ui/kit';

import { CookieBanner } from './cookie-banner';
import { SiteFooter } from './footer';
import { SiteHeader } from './header';

/** Public chrome around every route; /admin* and /dev-pay* get a bare page. Press feedback (kit) is wired here for all. */
export const SiteShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { t } = useLang();
  usePressFeedback();
  const bare = pathname.startsWith('/admin') || pathname.startsWith('/dev-pay');
  if (bare) return <div className="shell shell--bare">{children}</div>;
  return (
    <div className="shell">
      <a className="skip" href="#main">
        {t('nav.skip')}
      </a>
      <SiteHeader />
      <main id="main" className="shell__main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
};
