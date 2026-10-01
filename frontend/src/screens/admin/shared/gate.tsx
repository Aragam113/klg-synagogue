import { router, usePathname } from 'expo-router';
import i18next from 'i18next';
import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { store } from '@/store';
import { onAdminAuthLost } from '@/store/api/admin-auth';
import { clearAdminToken, getAdminToken } from '@/store/api/admin-token';
import { emptyApi } from '@/store/empty-api';

import { ADMIN_LOGIN, tokenExpired } from './auth-model';
import './styles';

/** Админка только на русском: фиксированный t неймспейса admin. */
export const useAdminT = () => useMemo(() => i18next.getFixedT('ru', 'admin'), []);

interface GateCtx {
  logout: (expired?: boolean) => void;
  /** Экран сообщает о несохранённых изменениях. */
  setDirty: (dirty: boolean) => void;
  /** true — можно уходить (нет изменений или редактор согласился их потерять). */
  confirmLeave: () => boolean;
}

const Ctx = createContext<GateCtx>({
  logout: () => undefined,
  setDirty: () => undefined,
  confirmLeave: () => true,
});
export const useAdminGate = () => useContext(Ctx);

/** Экран с формой: сообщает гейту о несохранённых изменениях (предупреждение при уходе). */
export const useDirtyGuard = (dirty: boolean) => {
  const { setDirty } = useAdminGate();
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
};

/**
 * Охрана /admin/*: без токена или с истёкшим — на логин; любой 401 от API — тоже.
 * Документ на время админки — ru/ltr (сайт мог быть на иврите).
 */
export const AdminGate = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const t = useAdminT();
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  const logout = useCallback(
    (expired = false) => {
      dirty.current = false;
      clearAdminToken().finally(() => {
        store.dispatch(emptyApi.util.resetApiState());
        const next = expired ? `&next=${encodeURIComponent(pathname)}` : '';
        router.replace(`${ADMIN_LOGIN}?${expired ? 'expired=1' : 'out=1'}${next}` as never);
      });
    },
    [pathname]
  );

  useEffect(() => {
    let alive = true;
    getAdminToken().then((tok) => {
      if (!alive) return;
      if (tokenExpired(tok, Date.now())) logout(!!tok);
      else setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [logout]);

  useEffect(() => {
    let out = false;
    return onAdminAuthLost(() => {
      if (out) return;
      out = true;
      logout(true);
    });
  }, [logout]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const prev = { lang: html.lang, dir: html.dir };
    html.lang = 'ru';
    html.dir = 'ltr';
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      html.lang = prev.lang;
      html.dir = prev.dir;
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  const value = useMemo<GateCtx>(
    () => ({
      logout,
      setDirty: (d) => {
        dirty.current = d;
      },
      confirmLeave: () => {
        if (!dirty.current) return true;
        const ok = typeof window === 'undefined' || window.confirm(t('common.leaveConfirm'));
        if (ok) dirty.current = false;
        return ok;
      },
    }),
    [logout, t]
  );

  if (!ready) return <div className="adm-login" aria-busy />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/** Внутренняя ссылка админки: спрашивает про несохранённые изменения. */
export const AdmLink = ({
  href,
  children,
  className = 'adm-btn',
  current,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  current?: boolean;
}) => {
  const { confirmLeave } = useAdminGate();
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (confirmLeave()) router.push(href as never);
  };
  return (
    <a href={href} className={className} onClick={go} aria-current={current ? 'page' : undefined}>
      {children}
    </a>
  );
};
