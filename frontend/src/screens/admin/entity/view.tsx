import { type FormEvent, type ReactNode } from 'react';

import { AdmLink, useAdminT } from '@/screens/admin/shared/gate';
import {
  AdmError,
  Chip,
  CoverField,
  Head,
  LocField,
  Pager,
  fieldError,
} from '@/screens/admin/shared/ui';
import type { Row } from '@/store/api/admin';
import { mediaUrl } from '@/store/api/content';
import { Checkbox, Empty, Field, Select } from '@/ui/kit';

import {
  type EntitySpec,
  errorFor,
  type FieldSpec,
  type FormErrors,
  type FormState,
  type Loc,
  type Tier,
  titleOf,
} from './entity-model';

/** Базовый путь админки сущности (галерея — /admin/gallery). */
export const adminBase = (spec: EntitySpec) =>
  `/admin/${spec.key === 'albums' ? 'gallery' : spec.key}`;

export interface EntityListViewProps {
  spec: EntitySpec;
  items: Row[];
  total: number;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onDelete: (row: Row) => void;
  deleting?: string;
}

/** Список: заголовок, дата/статус, «Изменить», «Удалить»; пусто — «Создать». */
export const EntityListView = (p: EntityListViewProps) => {
  const t = useAdminT();
  const base = adminBase(p.spec);
  const createBtn = (
    <AdmLink href={`${base}/new`} className="adm-btn adm-btn--primary">
      {t(`entity.${p.spec.key}.create`)}
    </AdmLink>
  );
  return (
    <>
      <Head title={t(`nav.${p.spec.key === 'albums' ? 'gallery' : p.spec.key}`)}>
        {p.items.length ? createBtn : null}
      </Head>
      <AdmError error={p.error} onRetry={p.onRetry} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {!p.loading && !p.error && !p.items.length ? (
        <Empty title={t(`entity.${p.spec.key}.empty`)} text={t('common.emptyText')}>
          {createBtn}
        </Empty>
      ) : null}
      {p.items.length ? (
        <ul className="adm-list" data-testid={`list-${p.spec.key}`}>
          {p.items.map((row) => {
            const pub = p.spec.publicUrl?.(row);
            const cover = mediaUrl(typeof row.cover === 'string' ? row.cover : null);
            return (
              <li className="adm-row" key={row.id} data-id={row.id}>
                {cover ? <img className="adm-row__thumb" src={cover} alt="" /> : null}
                <div className="adm-row__main">
                  <AdmLink href={`${base}/${row.id}`} className="adm-row__title">
                    {titleOf(row)}
                  </AdmLink>
                  <div className="adm-row__meta">
                    {p.spec.listMeta(row).map((m) =>
                      m.includes('.') && !/\d/.test(m) ? (
                        <Chip key={m} value={m.split('.')[1]}>
                          {t(m, { defaultValue: m })}
                        </Chip>
                      ) : /^(paid|free|published|hidden)$/.test(m) ? (
                        <Chip key={m} value={m}>
                          {t(`flag.${m}`)}
                        </Chip>
                      ) : (
                        <span key={m} className="adm-row__sub">
                          {m}
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="adm-row__actions">
                  {pub ? (
                    <a className="adm-btn" href={pub} target="_blank" rel="noreferrer">
                      {t('common.onSite')}
                    </a>
                  ) : null}
                  <AdmLink href={`${base}/${row.id}`}>{t('common.edit')}</AdmLink>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    disabled={p.deleting === row.id}
                    onClick={() => p.onDelete(row)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Pager page={p.page} total={p.total} limit={p.limit} onPage={p.onPage} />
    </>
  );
};

const TierRows = ({
  value,
  onChange,
  error,
}: {
  value: Tier[];
  onChange: (v: Tier[]) => void;
  error?: string;
}) => {
  const t = useAdminT();
  const set = (i: number, patch: Partial<Tier>) =>
    onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="field" data-field="priceTiers">
      <span className="field__label">{t('fields.priceTiers')}</span>
      <span className="field__hint">{t('fields.priceTiersHint')}</span>
      <div className="adm-tiers">
        {value.map((tier, i) => (
          <div className="adm-tier" key={i}>
            <Field
              label={t('fields.tierUntil')}
              type="date"
              value={tier.until}
              onChangeText={(v) => set(i, { until: v })}
            />
            <Field
              label={t('fields.tierPrice')}
              inputMode="numeric"
              value={tier.price}
              onChangeText={(v) => set(i, { price: v })}
            />
            <button
              type="button"
              className="adm-btn adm-btn--danger"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              {t('common.remove')}
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="adm-btn"
            onClick={() => onChange([...value, { until: '', price: '' }])}
          >
            {t('fields.addTier')}
          </button>
        </div>
      </div>
      {error ? (
        <span className="field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
};

export const FieldInput = ({
  f,
  value,
  onChange,
  error,
}: {
  f: FieldSpec;
  value: FormState[string];
  onChange: (v: FormState[string]) => void;
  error?: string;
}) => {
  const t = useAdminT();
  const label = t(`fields.${f.label ?? f.key}`);
  const hintKey = `hints.${f.key}`;
  const hint = t(hintKey, { defaultValue: '' }) || undefined;
  switch (f.kind) {
    case 'loc':
      return (
        <LocField
          label={label}
          name={f.key}
          value={value as Loc}
          onChange={onChange}
          required={f.required}
          multiline={f.multiline}
          error={error}
        />
      );
    case 'bool':
      return <Checkbox label={label} checked={value === true} onChange={onChange} name={f.key} />;
    case 'select':
      return (
        <Select
          label={label}
          name={f.key}
          value={value as string}
          onChange={onChange}
          options={(f.options ?? []).map((o) => ({ value: o, label: t(`${f.key}.${o}`) }))}
        />
      );
    case 'cover':
      return <CoverField label={label} value={value as string} onChange={onChange} error={error} />;
    case 'tiers':
      return <TierRows value={value as Tier[]} onChange={onChange} error={error} />;
    default:
      return (
        <Field
          label={label}
          name={f.key}
          value={value as string}
          onChangeText={onChange}
          required={f.required}
          error={error}
          hint={hint}
          multiline={f.kind === 'lines'}
          type={f.kind === 'datetime' ? 'datetime-local' : f.kind === 'date' ? 'date' : 'text'}
          inputMode={f.kind === 'int' ? 'numeric' : undefined}
        />
      );
  }
};

export interface EntityEditViewProps {
  spec: EntitySpec;
  isNew: boolean;
  form: FormState;
  onField: (key: string, v: FormState[string]) => void;
  errors: FormErrors;
  loading: boolean;
  loadError: unknown;
  saveError: unknown;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  onSave: () => void;
  onDelete?: () => void;
  publicUrl?: string | null;
  /** Доп. разделы (регистрации события, фото альбома). */
  extra?: ReactNode;
}

export const EntityEditView = (p: EntityEditViewProps) => {
  const t = useAdminT();
  const base = adminBase(p.spec);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    p.onSave();
  };
  const title = p.isNew
    ? t(`entity.${p.spec.key}.create`)
    : String((p.form.title as Loc | undefined)?.ru || t('common.untitled'));
  return (
    <>
      <Head
        title={title}
        back={{ href: base, label: t(`nav.${p.spec.key === 'albums' ? 'gallery' : p.spec.key}`) }}
      >
        {p.publicUrl ? (
          <a className="adm-btn" href={p.publicUrl} target="_blank" rel="noreferrer">
            {t('common.onSite')}
          </a>
        ) : null}
      </Head>
      <AdmError error={p.loadError} />
      {p.loading ? (
        <p className="adm-save__note">{t('common.loading')}</p>
      ) : (
        <form onSubmit={submit} noValidate data-testid={`edit-${p.spec.key}`}>
          <div className="adm-panel adm-grid">
            {p.spec.fields.map((f) => (
              <FieldInput
                key={f.key}
                f={f}
                value={p.form[f.key]}
                onChange={(v) => p.onField(f.key, v)}
                error={fieldError(errorFor(p.errors, f.key))}
              />
            ))}
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
            {p.onDelete ? (
              <button type="button" className="adm-btn adm-btn--danger" onClick={p.onDelete}>
                {t('common.delete')}
              </button>
            ) : null}
          </div>
        </form>
      )}
      {p.extra}
    </>
  );
};
