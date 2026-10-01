import { useEffect, useMemo, useState } from 'react';

import { useAdminT, useDirtyGuard } from '@/screens/admin/shared/gate';
import { confirmDelete, fmtDate } from '@/screens/admin/shared/ui';
import {
  type ScheduleOverride,
  useDeleteScheduleOverrideMutation,
  useGetScheduleOverridesQuery,
  useGetScheduleTemplateQuery,
  usePutScheduleOverrideMutation,
  usePutScheduleTemplateMutation,
} from '@/store/api/calendar';
import { asApiError } from '@/store/api/http';
import { kaliningradToday } from '@/utils/kld-time';

import {
  emptyOverride,
  overrideBody,
  overrideErrors,
  overrideForm,
  type OverrideForm,
  scheduleErrors,
  templateBody,
  templateForm,
  overrideWindow,
  windowPageOf,
} from './model';
import { ScheduleView } from './view';

/** /admin/schedule — шаблон и исключения (эндпоинты /admin/schedule/* модуля calendar). */
export const ScheduleAdminScreen = () => {
  const t = useAdminT();
  const tq = useGetScheduleTemplateQuery();
  const today = useMemo(() => kaliningradToday(), []);
  const [page, setPage] = useState(0);
  const range = useMemo(() => overrideWindow(today, page), [today, page]);
  const oq = useGetScheduleOverridesQuery(range);
  const [putTemplate, tst] = usePutScheduleTemplateMutation();
  const [putOverride, ost] = usePutScheduleOverrideMutation();
  const [delOverride, dst] = useDeleteScheduleOverrideMutation();

  const initial = useMemo(() => templateForm(tq.data), [tq.data]);
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  const [tErrors, setTErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<OverrideForm>(emptyOverride(today));
  const [dErrors, setDErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  useDirtyGuard(dirty);

  const onSaveTemplate = async () => {
    const errs = scheduleErrors(form);
    setTErrors(errs);
    setSaved(false);
    if (Object.keys(errs).length) return;
    const res = await putTemplate(templateBody(form));
    if ('error' in res) setTErrors(asApiError(res.error)?.fields ?? {});
    else setSaved(true);
  };

  const onSaveOverride = async () => {
    const errs = overrideErrors(draft);
    setDErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await putOverride(overrideBody(draft));
    if ('error' in res) setDErrors(asApiError(res.error)?.fields ?? {});
    else {
      setPage(windowPageOf(today, draft.date));
      setDraft(emptyOverride(today));
    }
  };

  const onDeleteOverride = (o: ScheduleOverride) => {
    if (confirmDelete(t('schedule.deleteConfirm', { date: fmtDate(o.date) }))) delOverride(o.date);
  };

  return (
    <ScheduleView
      template={form}
      onTemplate={(d, s, v) => setForm((f) => ({ ...f, [d]: { ...f[d], [s]: v } }))}
      templateErrors={tErrors}
      onSaveTemplate={onSaveTemplate}
      templateSaving={tst.isLoading}
      templateSaved={saved}
      templateDirty={dirty}
      templateError={tst.error}
      loading={tq.isLoading}
      loadError={tq.error ?? oq.error}
      overrides={oq.data ?? []}
      overridesLoading={oq.isFetching}
      range={range}
      onPage={(d) => setPage((n) => n + d)}
      onToday={page === 0 ? undefined : () => setPage(0)}
      draft={draft}
      onDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
      draftErrors={dErrors}
      onSaveOverride={onSaveOverride}
      overrideSaving={ost.isLoading}
      overrideError={ost.error ?? dst.error}
      onEditOverride={(o) => {
        setDraft(overrideForm(o));
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
      }}
      onDeleteOverride={onDeleteOverride}
    />
  );
};
