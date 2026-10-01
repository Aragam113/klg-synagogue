import { usePathname } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';

import { useAdminRequestsQuery } from '@/store/api/admin-requests';
import { MagenDavid } from '@/ui/judaica/magen-david';

import { AdmLink, useAdminGate, useAdminT } from './gate';

/** Боковое меню админки (порядок пунктов задан намеренно). */
export const ADMIN_NAV = [
  'requests',
  'yahrzeits',
  'news',
  'events',
  'fundraisers',
  'schedule',
  'programs',
  'departments',
  'gallery',
  'payments',
  'subscribers',
  'settings',
] as const;

export const AdminShell = ({ children }: { children: ReactNode }) => {
  const t = useAdminT();
  const pathname = usePathname();
  const { logout, confirmLeave } = useAdminGate();
  const [open, setOpen] = useState(false);
  const fresh = useAdminRequestsQuery({ status: 'new', limit: 1 }, { pollingInterval: 60_000 });
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className={`adm${open ? ' adm--open' : ''}`} data-testid="admin">
      <aside className="adm__side">
        <div className="adm__top">
          <AdmLink href="/admin/requests" className="adm__brand">
            <MagenDavid size="1.4rem" strokeWidth={1.4} />
            {t('brand')}
          </AdmLink>
          <button
            type="button"
            className="adm-btn adm__burger"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {t('common.menu')}
          </button>
        </div>
        <nav className="adm__nav" aria-label={t('brand')}>
          {ADMIN_NAV.map((key) => {
            const href = `/admin/${key}`;
            const count = key === 'requests' ? (fresh.data?.total ?? 0) : 0;
            return (
              <AdmLink
                key={key}
                href={href}
                className="adm__link"
                current={pathname === href || pathname.startsWith(`${href}/`)}
              >
                <span>{t(`nav.${key}`)}</span>
                {count ? (
                  <span className="adm__count" title={t('nav.newRequests')} data-testid="new-count">
                    {count}
                  </span>
                ) : null}
              </AdmLink>
            );
          })}
          <button
            type="button"
            className="adm__link adm__logout"
            data-testid="logout"
            onClick={() => confirmLeave() && logout(false)}
          >
            {t('nav.logout')}
          </button>
        </nav>
      </aside>
      <main className="adm__main">
        <div className="adm__inner">{children}</div>
      </main>
    </div>
  );
};
