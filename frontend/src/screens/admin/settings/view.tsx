import { type FormEvent } from 'react';

import { useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, Head, LocField, fieldError } from '@/screens/admin/shared/ui';
import { Field } from '@/ui/kit';

import type { SettingsForm } from './model';

export interface SettingsViewProps {
  form: SettingsForm;
  onField: <K extends keyof SettingsForm>(k: K, v: SettingsForm[K]) => void;
  errors: Record<string, string>;
  loading: boolean;
  loadError: unknown;
  saveError: unknown;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  onSave: () => void;
}

/** Счётчик, тариф Кадиша, реквизиты, оператор ПДн, соцсети, телефоны шапки. */
export const SettingsView = (p: SettingsViewProps) => {
  const t = useAdminT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    p.onSave();
  };
  return (
    <>
      <Head title={t('nav.settings')} />
      <AdmError error={p.loadError} />
      {p.loading ? (
        <p className="adm-save__note">{t('common.loading')}</p>
      ) : (
        <form onSubmit={submit} noValidate data-testid="settings">
          <div className="adm-panel adm-grid">
            <h2>{t('settings.money')}</h2>
            <div className="adm-grid adm-grid--2">
              <Field
                label={t('fields.supporters_offset')}
                name="supporters_offset"
                inputMode="numeric"
                value={p.form.supporters_offset}
                onChangeText={(v) => p.onField('supporters_offset', v)}
                error={fieldError(p.errors.supporters_offset)}
                hint={t('hints.supporters_offset')}
              />
              <Field
                label={t('fields.kaddish_month_rub')}
                name="kaddish_month_rub"
                inputMode="numeric"
                value={p.form.kaddish_month_rub}
                onChangeText={(v) => p.onField('kaddish_month_rub', v)}
                error={fieldError(p.errors.kaddish_month_rub)}
                hint={t('hints.kaddish_month_rub')}
              />
            </div>
            <LocField
              label={t('fields.requisites')}
              name="requisites"
              multiline
              value={p.form.requisites}
              onChange={(v) => p.onField('requisites', v)}
              error={fieldError(p.errors['requisites.ru'] ?? p.errors.requisites)}
            />
          </div>
          <div className="adm-panel adm-grid">
            <h2>{t('settings.contacts')}</h2>
            <Field
              label={t('fields.header_phones')}
              name="header_phones"
              multiline
              value={p.form.header_phones}
              onChangeText={(v) => p.onField('header_phones', v)}
              error={fieldError(p.errors.header_phones)}
              hint={t('hints.lines')}
            />
            <Field
              label={t('fields.socials')}
              name="socials"
              multiline
              value={p.form.socials}
              onChangeText={(v) => p.onField('socials', v)}
              error={fieldError(p.errors.socials)}
              hint={t('hints.socials')}
            />
            <LocField
              label={t('fields.operator')}
              name="operator"
              multiline
              value={p.form.operator}
              onChange={(v) => p.onField('operator', v)}
              error={fieldError(p.errors['operator.ru'] ?? p.errors.operator)}
            />
          </div>
          <AdmError error={p.saveError} />
          <div className="adm-save">
            <button
              type="submit"
              className="adm-btn adm-btn--primary"
              disabled={p.saving}
              data-testid="save"
            >
              {p.saving ? t('common.saving') : t('common.save')}
            </button>
            {p.saved && !p.dirty ? <span className="adm-ok">{t('common.saved')}</span> : null}
            {p.dirty ? <span className="adm-save__note">{t('common.unsaved')}</span> : null}
          </div>
        </form>
      )}
    </>
  );
};
