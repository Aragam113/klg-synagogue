import { useState } from 'react';

import { useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, confirmDelete, CoverField, LocField } from '@/screens/admin/shared/ui';
import {
  type Row,
  useAdminCreateMutation,
  useAdminDeleteMutation,
  useAdminListQuery,
  useAdminUpdateMutation,
} from '@/store/api/admin';
import { mediaUrl } from '@/store/api/content';
import { Field } from '@/ui/kit';

import { fromLoc, type Loc, toLoc } from './entity-model';

/** Одно фото: подпись RU/EN/HE, атрибуция (автор, лицензия), порядок. */
const PhotoRow = ({ row }: { row: Row }) => {
  const t = useAdminT();
  const [caption, setCaption] = useState<Loc>(toLoc(row.caption));
  const [credit, setCredit] = useState(String(row.credit ?? ''));
  const [sort, setSort] = useState(String(row.sort ?? 0));
  const [update, ust] = useAdminUpdateMutation();
  const [remove, dst] = useAdminDeleteMutation();
  const changed =
    JSON.stringify(caption) !== JSON.stringify(toLoc(row.caption)) ||
    credit !== String(row.credit ?? '') ||
    sort !== String(row.sort ?? 0);
  const save = () =>
    update({
      path: 'photos',
      id: row.id,
      body: {
        caption: fromLoc(caption),
        credit: credit.trim() || null,
        sort: /^-?\d+$/.test(sort.trim()) ? Number(sort.trim()) : 0,
      },
    });
  return (
    <li className="adm-row" data-id={row.id}>
      <img className="adm-cover__img" src={mediaUrl(String(row.file))} alt="" />
      <div className="adm-row__main adm-grid">
        <LocField label={t('fields.caption')} value={caption} onChange={setCaption} />
        <div className="adm-grid adm-grid--2">
          <Field
            label={t('fields.credit')}
            value={credit}
            onChangeText={setCredit}
            hint={t('hints.credit')}
          />
          <Field label={t('fields.sort')} value={sort} onChangeText={setSort} inputMode="numeric" />
        </div>
        <div className="adm-row__actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            disabled={!changed || ust.isLoading}
            onClick={save}
          >
            {ust.isLoading ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--danger"
            disabled={dst.isLoading}
            onClick={() =>
              confirmDelete(t('photos.deleteConfirm')) && remove({ path: 'photos', id: row.id })
            }
          >
            {t('common.delete')}
          </button>
        </div>
        <AdmError error={ust.error ?? dst.error} />
      </div>
    </li>
  );
};

/** Фото альбома: загрузка, подписи, атрибуция. */
export const AlbumPhotos = ({ albumId }: { albumId: string }) => {
  const t = useAdminT();
  const q = useAdminListQuery({ path: 'photos', albumId, limit: 50 });
  const [create, cst] = useAdminCreateMutation();
  const [upKey, setUpKey] = useState(0);
  const rows = q.data?.items ?? [];
  const add = async (url: string) => {
    if (!url) return;
    const sort = rows.reduce((m, r) => Math.max(m, Number(r.sort ?? 0)), 0) + 1;
    await create({ path: 'photos', body: { albumId, file: url, sort } });
    setUpKey((k) => k + 1);
  };
  return (
    <section className="adm-panel" data-testid="photos">
      <h2>
        {t('photos.title')} · {q.data?.total ?? 0}
      </h2>
      <CoverField key={upKey} label={t('photos.add')} value="" onChange={add} />
      <AdmError error={q.error ?? cst.error} onRetry={q.refetch} />
      {!q.isLoading && !rows.length ? <p className="adm-save__note">{t('photos.empty')}</p> : null}
      <ul className="adm-list">
        {rows.map((r) => (
          <PhotoRow key={`${r.id}:${String(r.sort)}:${JSON.stringify(r.caption)}`} row={r} />
        ))}
      </ul>
    </section>
  );
};
