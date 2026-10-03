import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { routeHref } from '@/config/demo';
import { loginTarget, tokenExpired } from '@/screens/admin/shared/auth-model';
import { useAdminT } from '@/screens/admin/shared/gate';
import { useAdminLoginMutation } from '@/store/api/admin';
import { getAdminToken, setAdminToken } from '@/store/api/admin-token';
import { asApiError } from '@/store/api/http';

import { loginErrors, type LoginValues } from './model';
import { LoginView } from './view';

/**
 * После входа — полная загрузка цели: router.replace из /admin/login (вне AdminGate) в соседний
 * вложенный маршрут expo-router уводил на /admin → /admin/requests вместо `next`.
 */
const goTo = (href: string) => {
  if (typeof window !== 'undefined') window.location.replace(routeHref(href));
  else router.replace(href as never);
};

/** /admin/login — POST /admin/login → setAdminToken → туда, откуда пришли. */
export const AdminLoginScreen = () => {
  const t = useAdminT();
  const q = useLocalSearchParams<{ next?: string; expired?: string; out?: string }>();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginValues, string>>>({});
  const [failed, setFailed] = useState<string | undefined>();
  const [login, st] = useAdminLoginMutation();
  const urlNext =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('next')
      : undefined;
  const target = loginTarget(typeof q.next === 'string' ? q.next : urlNext);

  useEffect(() => {
    getAdminToken().then((tok) => {
      if (!tokenExpired(tok, Date.now())) goTo(target);
    });
  }, [target]);

  const submit = async () => {
    const errs = loginErrors(values);
    setErrors(errs);
    setFailed(undefined);
    if (Object.keys(errs).length) return;
    const res = await login({ email: values.email.trim(), password: values.password });
    if ('data' in res && res.data?.token) {
      await setAdminToken(res.data.token);
      goTo(target);
      return;
    }
    const e = asApiError(res.error);
    setFailed(
      e?.status === 401 || e?.status === 400
        ? t('login.wrong')
        : e?.status === 429
          ? t('errors.tooMany')
          : e?.status === 'network'
            ? t('errors.network')
            : (e?.message ?? t('errors.server'))
    );
  };

  const banner = failed
    ? { kind: 'error' as const, text: failed }
    : q.expired
      ? { kind: 'info' as const, text: t('login.expired') }
      : q.out
        ? { kind: 'info' as const, text: t('login.loggedOut') }
        : undefined;

  return (
    <LoginView
      values={values}
      onChange={(f, v) => setValues((s) => ({ ...s, [f]: v }))}
      errors={errors}
      banner={banner}
      busy={st.isLoading}
      onSubmit={submit}
    />
  );
};
