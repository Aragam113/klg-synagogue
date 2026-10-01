import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useAdminGate, useAdminT, useDirtyGuard } from '@/screens/admin/shared/gate';
import { confirmDelete } from '@/screens/admin/shared/ui';
import {
  type Row,
  useAdminCreateMutation,
  useAdminDeleteMutation,
  useAdminGetQuery,
  useAdminListQuery,
  useAdminUpdateMutation,
} from '@/store/api/admin';
import { asApiError } from '@/store/api/http';

import {
  emptyForm,
  ENTITIES,
  type EntityKey,
  type FormErrors,
  type FormState,
  isDirty,
  titleOf,
  toBody,
  toForm,
  validate,
} from './entity-model';
import { AlbumPhotos } from './photos';
import { EventRegistrations } from './registrations';
import { adminBase, EntityEditView, EntityListView } from './view';

const LIMIT = 50;

/** /admin/<entity> — список с пагинацией и удалением с подтверждением. */
export const EntityListScreen = ({ entity }: { entity: EntityKey }) => {
  const spec = ENTITIES[entity];
  const t = useAdminT();
  const [page, setPage] = useState(1);
  const q = useAdminListQuery({ path: spec.path as never, page, limit: LIMIT });
  const [remove, del] = useAdminDeleteMutation();
  const [deleting, setDeleting] = useState<string>();
  const [delError, setDelError] = useState<unknown>();
  const onDelete = async (row: Row) => {
    if (!confirmDelete(t('common.deleteConfirm', { title: titleOf(row) }))) return;
    setDeleting(row.id);
    setDelError(undefined);
    const res = await remove({ path: spec.path as never, id: row.id });
    if ('error' in res) setDelError(res.error);
    setDeleting(undefined);
  };
  return (
    <EntityListView
      spec={spec}
      items={q.data?.items ?? []}
      total={q.data?.total ?? 0}
      page={page}
      limit={LIMIT}
      onPage={setPage}
      loading={q.isLoading}
      error={q.error ?? delError}
      onRetry={q.refetch}
      onDelete={onDelete}
      deleting={del.isLoading ? deleting : undefined}
    />
  );
};

/** /admin/<entity>/new | /admin/<entity>/<id> — форма записи (RU/EN/HE, обложка). */
export const EntityEditScreen = ({ entity, id }: { entity: EntityKey; id: string }) => {
  const spec = ENTITIES[entity];
  const t = useAdminT();
  const isNew = id === 'new';
  const path = spec.path as never;
  const q = useAdminGetQuery({ path, id }, { skip: isNew });
  const initial = useMemo(
    () => (isNew || !q.data ? emptyForm(spec) : toForm(spec, q.data)),
    [isNew, q.data, spec]
  );
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState(false);
  const [create, cst] = useAdminCreateMutation();
  const [update, ust] = useAdminUpdateMutation();
  const [remove] = useAdminDeleteMutation();
  const { setDirty } = useAdminGate();
  useEffect(() => setForm(initial), [initial]);
  const dirty = isDirty(form, initial);
  useDirtyGuard(dirty);

  const onSave = async () => {
    const errs = validate(spec, form);
    setErrors(errs);
    setSaved(false);
    if (Object.keys(errs).length) return;
    const body = toBody(spec, form);
    const res = isNew ? await create({ path, body }) : await update({ path, id, body });
    if ('error' in res) {
      setErrors(asApiError(res.error)?.fields ?? {});
      return;
    }
    setSaved(true);
    if (isNew && res.data) {
      setDirty(false);
      router.replace(`${adminBase(spec)}/${res.data.id}` as never);
    }
  };

  const onDelete = async () => {
    if (!q.data || !confirmDelete(t('common.deleteConfirm', { title: titleOf(q.data) }))) return;
    const res = await remove({ path, id });
    if (!('error' in res)) {
      setDirty(false);
      router.replace(adminBase(spec) as never);
    }
  };

  const extra =
    isNew || !q.data ? null : entity === 'events' ? (
      <EventRegistrations eventId={id} slug={String(q.data.slug ?? '')} />
    ) : entity === 'albums' ? (
      <AlbumPhotos albumId={id} />
    ) : null;

  return (
    <EntityEditView
      spec={spec}
      isNew={isNew}
      form={form}
      onField={(k, v) => setForm((s) => ({ ...s, [k]: v }))}
      errors={errors}
      loading={!isNew && q.isLoading}
      loadError={q.error}
      saveError={cst.error ?? ust.error}
      saving={cst.isLoading || ust.isLoading}
      saved={saved}
      dirty={dirty}
      onSave={onSave}
      onDelete={isNew ? undefined : onDelete}
      publicUrl={q.data ? spec.publicUrl?.(q.data) : null}
      extra={extra}
    />
  );
};
