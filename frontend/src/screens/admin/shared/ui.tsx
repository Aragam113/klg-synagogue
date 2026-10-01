import i18next from 'i18next';
import { type ChangeEvent, type ReactNode, useState } from 'react';

import { errorMessageKey } from '@/forms/form-model';
import type { Loc } from '@/screens/admin/entity/entity-model';
import { useAdminUploadMutation } from '@/store/api/admin';
import { reportAdminResponse } from '@/store/api/admin-auth';
import { getAdminToken } from '@/store/api/admin-token';
import { mediaUrl } from '@/store/api/content';
import { type ApiError, asApiError } from '@/store/api/http';
import { API_BASE_URL } from '@/store/empty-api';
import { ErrorBox, Field } from '@/ui/kit';

import { AdmLink, useAdminT } from './gate';
import { uploadError, UPLOAD_TYPES } from './upload-model';

export const LANG_TABS = ['ru', 'en', 'he'] as const;

/**
 * Машинный ключ ошибки поля (`required`, `seats_left:3`) → текст: разбор через errorMessageKey (`@/forms/form-model`),
 * перевод — admin:errors.*, затем common:fieldErrors.* (админка всегда на русском).
 */
export const fieldError = (apiKey?: string | null): string | undefined => {
  if (!apiKey) return undefined;
  const { key, params } = errorMessageKey(apiKey);
  const common = i18next.t(`fieldErrors.${key}`, { ns: 'common', lng: 'ru', defaultValue: key });
  return i18next.t(`errors.${key}`, { ns: 'admin', lng: 'ru', ...params, defaultValue: common });
};

export const Head = ({
  title,
  back,
  children,
}: {
  title: ReactNode;
  back?: { href: string; label: string };
  children?: ReactNode;
}) => (
  <header className="adm-head">
    <div>
      {back ? (
        <AdmLink href={back.href} className="adm-head__back">
          ← {back.label}
        </AdmLink>
      ) : null}
      <h1>{title}</h1>
    </div>
    {children ? <div className="adm-row__actions">{children}</div> : null}
  </header>
);

export const Chip = ({ value, children }: { value: string; children: ReactNode }) => (
  <span className={`adm-chip adm-chip--${value}`}>{children}</span>
);

/** Ошибка API в ErrorBox кита: тексты сети/5xx/404 — по-русски из admin:errors. */
export const AdmError = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => {
  const t = useAdminT();
  const e = asApiError(error);
  if (!e) return null;
  const text =
    e.status === 'network'
      ? t('errors.network')
      : typeof e.status === 'number' && e.status >= 500
        ? t('errors.server')
        : e.status === 404
          ? t('errors.notFound')
          : e.message;
  return <ErrorBox error={text} onRetry={onRetry} retryLabel={t('common.retry')} />;
};

export const confirmDelete = (text: string): boolean =>
  typeof window === 'undefined' || window.confirm(text);

/** Локализуемое поле: вкладки RU / EN / HE, RU обязателен. */
export const LocField = ({
  label,
  value,
  onChange,
  error,
  required,
  multiline,
  name,
}: {
  label: string;
  value: Loc;
  onChange: (v: Loc) => void;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  name?: string;
}) => {
  const t = useAdminT();
  const [tab, setTab] = useState<(typeof LANG_TABS)[number]>('ru');
  return (
    <div className="adm-loc" data-field={name}>
      <div className="adm-loc__head">
        <span className="adm-loc__label">
          {label}
          {required ? <span className="field__req"> *</span> : null}
        </span>
        <div className="adm-tabs" role="tablist">
          {LANG_TABS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              className="adm-tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              data-lang={l}
            >
              {l.toUpperCase()}
              {value[l].trim() ? <span className="adm-tab__dot">•</span> : null}
            </button>
          ))}
        </div>
      </div>
      <div dir={tab === 'he' ? 'rtl' : 'ltr'}>
        <Field
          key={tab}
          label={t(`common.lang.${tab}`)}
          name={name ? `${name}.${tab}` : undefined}
          value={value[tab]}
          onChangeText={(v) => onChange({ ...value, [tab]: v })}
          multiline={multiline}
          error={tab === 'ru' ? error : undefined}
          hint={tab === 'ru' ? undefined : t('common.optionalLang')}
        />
      </div>
    </div>
  );
};

/** Обложка/фото: загрузка файла → /media/... с превью. */
export const CoverField = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
}) => {
  const t = useAdminT();
  const [upload, st] = useAdminUploadMutation();
  const [fail, setFail] = useState<string | undefined>();
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    // Очистка сразу: тот же файл можно выбрать снова (после ошибки или повторно).
    input.value = '';
    if (!file) return;
    const bad = uploadError(file);
    setFail(bad ? fieldError(bad) : undefined);
    if (bad) return;
    const res = await upload(file);
    if ('data' in res && res.data) onChange(res.data.url);
    else {
      const err: ApiError | undefined = asApiError(res.error);
      setFail(
        err?.fields?.file ? fieldError(err.fields.file) : (err?.message ?? t('errors.upload'))
      );
    }
  };
  const src = mediaUrl(value);
  return (
    <div className="field" data-field="cover">
      <span className="field__label">{label}</span>
      <div className="adm-cover">
        {src ? (
          <img className="adm-cover__img" src={src} alt="" />
        ) : (
          <div className="adm-cover__img adm-cover__empty">{t('common.noImage')}</div>
        )}
        <div className="adm-row__actions">
          <input
            type="file"
            accept={UPLOAD_TYPES.join(',')}
            aria-label={label}
            disabled={st.isLoading}
            onChange={pick}
          />
          {value ? (
            <button type="button" className="adm-btn adm-btn--danger" onClick={() => onChange('')}>
              {t('common.removeImage')}
            </button>
          ) : null}
        </div>
      </div>
      {st.isLoading ? <span className="field__hint">{t('common.uploading')}</span> : null}
      {fail || error ? (
        <span className="field__error" role="alert">
          {fail ?? error}
        </span>
      ) : null}
    </div>
  );
};

export const Pager = ({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) => {
  const t = useAdminT();
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="adm-pager">
      <button
        type="button"
        className="adm-btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ←
      </button>
      <span>{t('common.page', { page, pages })}</span>
      <button
        type="button"
        className="adm-btn"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
      >
        →
      </button>
    </div>
  );
};

/** CSV с Bearer: fetch → blob → скачивание. */
export const downloadCsv = async (path: string, filename: string): Promise<void> => {
  const token = await getAdminToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  reportAdminResponse(path, res.status);
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const CsvButton = ({ path, filename }: { path: string; filename: string }) => {
  const t = useAdminT();
  const [state, setState] = useState<'idle' | 'busy' | 'fail'>('idle');
  const go = () => {
    setState('busy');
    downloadCsv(path, filename)
      .then(() => setState('idle'))
      .catch(() => setState('fail'));
  };
  return (
    <>
      <button
        type="button"
        className="adm-btn"
        onClick={go}
        disabled={state === 'busy'}
        data-testid="csv"
      >
        {t('common.csv')}
      </button>
      {state === 'fail' ? <span className="field__error">{t('errors.csv')}</span> : null}
    </>
  );
};

export const fmtDate = (d: string | null | undefined): string =>
  d ? d.slice(0, 10).split('-').reverse().join('.') : '—';
