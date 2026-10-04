import { type FormEvent } from 'react';

import { useAdminT } from '@/screens/admin/shared/gate';
import { fieldError } from '@/screens/admin/shared/ui';
import { MagenDavid } from '@/ui/judaica/magen-david';
import { Button, Field } from '@/ui/kit';

import type { LoginValues } from './model';
import '@/screens/admin/shared/styles';

export interface LoginViewProps {
  values: LoginValues;
  onChange: (field: keyof LoginValues, v: string) => void;
  errors: Partial<Record<keyof LoginValues, string>>;
  /** Баннер: неверные данные, сеть, истёкшая сессия, выход. */
  banner?: { kind: 'error' | 'info'; text: string };
  busy: boolean;
  onSubmit: () => void;
}

export const LoginView = (p: LoginViewProps) => {
  const t = useAdminT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    p.onSubmit();
  };
  return (
    <div className="adm-login">
      <form className="adm-login__card" onSubmit={submit} noValidate data-testid="admin-login">
        <h1>
          <MagenDavid size="1.6rem" strokeWidth={1.4} />
          {t('login.title')}
        </h1>
        {p.banner ? (
          <p className={p.banner.kind === 'error' ? 'field__error' : 'adm-save__note'} role="alert">
            {p.banner.text}
          </p>
        ) : null}
        <Field
          label={t('login.email')}
          name="email"
          type="email"
          autoComplete="username"
          value={p.values.email}
          onChangeText={(v) => p.onChange('email', v)}
          error={fieldError(p.errors.email)}
          required
        />
        <Field
          label={t('login.password')}
          name="password"
          type="password"
          autoComplete="current-password"
          value={p.values.password}
          onChangeText={(v) => p.onChange('password', v)}
          error={fieldError(p.errors.password)}
          required
        />
        <Button type="submit" busy={p.busy}>
          {p.busy ? t('common.wait') : t('login.submit')}
        </Button>
      </form>
    </div>
  );
};
