import { useEffect, useMemo, useState } from 'react';

import { useDirtyGuard } from '@/screens/admin/shared/gate';
import { useAdminPutSettingsMutation, useAdminSettingsQuery } from '@/store/api/admin';
import { asApiError } from '@/store/api/http';

import {
  type AdminSettings,
  settingsBody,
  settingsErrors,
  settingsForm,
  type SettingsForm,
} from './model';
import { SettingsView } from './view';

/** /admin/settings — GET|PUT /admin/settings (snake_case). */
export const SettingsScreen = () => {
  const q = useAdminSettingsQuery();
  const [put, st] = useAdminPutSettingsMutation();
  const initial = useMemo(
    () => settingsForm(q.data as Partial<AdminSettings> | undefined),
    [q.data]
  );
  const [form, setForm] = useState<SettingsForm>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(initial), [initial]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useDirtyGuard(dirty);

  const onSave = async () => {
    const errs = settingsErrors(form);
    setErrors(errs);
    setSaved(false);
    if (Object.keys(errs).length) return;
    const res = await put(settingsBody(form) as unknown as Record<string, unknown>);
    if ('error' in res) setErrors(asApiError(res.error)?.fields ?? {});
    else setSaved(true);
  };

  return (
    <SettingsView
      form={form}
      onField={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
      errors={errors}
      loading={q.isLoading}
      loadError={q.error}
      saveError={st.error}
      saving={st.isLoading}
      saved={saved}
      dirty={dirty}
      onSave={onSave}
    />
  );
};
