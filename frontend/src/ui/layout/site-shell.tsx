import { usePathname } from 'expo-router';
import { type ReactNode } from 'react';

import { CookieBanner } from './cookie-banner';
import { SiteFooter } from './footer';
import { SiteHeader } from './header';

/** Public chrome around every route; /admin* and /dev-pay* get a bare page. */
export const SiteShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const bare = pathname.startsWith('/admin') || pathname.startsWith('/dev-pay');
  if (bare) return <div className="shell shell--bare">{children}</div>;
  return (
    <div className="shell">
      <a className="skip" href="#main">
        ↓
      </a>
      <SiteHeader />
      <main id="main" className="shell__main">
        {children}
      </main>
      <SiteFooter />
      <CookieBanner />
    </div>
  );
};
