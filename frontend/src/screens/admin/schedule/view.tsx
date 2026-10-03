import { type FormEvent } from 'react';

import { useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, fmtDate, Head, LocField, fieldError } from '@/screens/admin/shared/ui';
import type { ScheduleOverride } from '@/store/api/calendar';
import { Field, Link } from '@/ui/kit';

import {
  DAY_KINDS,
  type DayKind,
  type OverrideForm,
  type Service,
  SERVICES,
  type TemplateForm,
} from './model';

export interface ScheduleViewProps {
  template: TemplateForm;
  onTemplate: (day: DayKind, s: Service, v: string) => void;
  templateErrors: Record<string, string>;
  onSaveTemplate: () => void;
  templateSaving: boolean;
  templateSaved: boolean;
  templateDirty: boolean;
  templateError: unknown;
  loading: boolean;
  loadError: unknown;
  overrides: ScheduleOverride[];
  overridesLoading: boolean;
  /** Окно исключений (≤ 62 дня) и листание окон. */
  range: { from: string; to: string };
  onPage: (delta: -1 | 1) => void;
  onToday?: () => void;
  draft: OverrideForm;
  onDraft: (patch: Partial<OverrideForm>) => void;
  draftErrors: Record<string, string>;
  onSaveOverride: () => void;
  overrideSaving: boolean;
  overrideError: unknown;
  onEditOverride: (o: ScheduleOverride) => void;
  onDeleteOverride: (o: ScheduleOverride) => void;
}

const times = (o: ScheduleOverride, t: (k: string) => string) =>
  SERVICES.map((s) => `${t(`service.${s}`)} ${o[s] ?? '—'}`).join(' · ');

/** Недельный шаблон + исключения на даты; правки видны на /schedule. */
export const ScheduleView = (p: ScheduleViewProps) => {
  const t = useAdminT();
  const submitTemplate = (e: FormEvent) => {
    e.preventDefault();
    p.onSaveTemplate();
  };
  const submitOverride = (e: FormEvent) => {
    e.preventDefault();
    p.onSaveOverride();
  };
  return (
    <>
      <Head title={t('nav.schedule')}>
        <Link className="adm-btn" href="/schedule" external>
          {t('common.onSite')}
        </Link>
      </Head>
      <AdmError error={p.loadError} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      <form className="adm-panel" onSubmit={submitTemplate} noValidate data-testid="template">
        <h2>{t('schedule.template')}</h2>
        <p className="adm-save__note">{t('schedule.templateHint')}</p>
        <table className="adm-sched">
          <thead>
            <tr>
              <th />
              {SERVICES.map((s) => (
                <th key={s}>{t(`service.${s}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_KINDS.map((d) => (
              <tr key={d}>
                <th scope="row">{t(`schedule.day.${d}`)}</th>
                {SERVICES.map((s) => (
                  <td key={s}>
                    <Field
                      label={`${t(`schedule.day.${d}`)} · ${t(`service.${s}`)}`}
                      name={`${d}.${s}`}
                      type="time"
                      value={p.template[d][s]}
                      onChangeText={(v) => p.onTemplate(d, s, v)}
                      error={fieldError(p.templateErrors[`${d}.${s}`])}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <AdmError error={p.templateError} />
        <div className="adm-row__actions" style={{ marginTop: '1rem' }}>
          <button
            type="submit"
            className="adm-btn adm-btn--primary"
            disabled={p.templateSaving}
            data-testid="save-template"
          >
            {p.templateSaving ? t('common.saving') : t('common.save')}
          </button>
          {p.templateSaved && !p.templateDirty ? (
            <span className="adm-ok">{t('common.saved')}</span>
          ) : null}
          {p.templateDirty ? <span className="adm-save__note">{t('common.unsaved')}</span> : null}
        </div>
      </form>

      <section className="adm-panel" data-testid="overrides">
        <h2>{t('schedule.overrides')}</h2>
        <p className="adm-save__note">{t('schedule.overridesHint')}</p>
        <form className="adm-grid" onSubmit={submitOverride} noValidate>
          <div className="adm-grid adm-grid--2">
            <Field
              label={t('fields.date')}
              name="override.date"
              type="date"
              required
              value={p.draft.date}
              onChangeText={(date) => p.onDraft({ date })}
              error={fieldError(p.draftErrors.date)}
            />
          </div>
          <div className="adm-grid adm-grid--3">
            {SERVICES.map((s) => (
              <Field
                key={s}
                label={t(`service.${s}`)}
                name={`override.${s}`}
                type="time"
                value={p.draft[s]}
                onChangeText={(v) => p.onDraft({ [s]: v })}
                error={fieldError(p.draftErrors[s])}
                hint={t('schedule.emptyIsNone')}
              />
            ))}
          </div>
          <LocField
            label={t('fields.note')}
            name="override.note"
            value={p.draft.note}
            onChange={(note) => p.onDraft({ note })}
          />
          <AdmError error={p.overrideError} />
          <div>
            <button
              type="submit"
              className="adm-btn adm-btn--primary"
              disabled={p.overrideSaving}
              data-testid="save-override"
            >
              {t('schedule.saveOverride')}
            </button>
          </div>
        </form>
        <div className="adm-pager" data-testid="override-window" style={{ marginTop: '1.25rem' }}>
          <button type="button" className="adm-btn" onClick={() => p.onPage(-1)}>
            {t('schedule.earlier')}
          </button>
          <span aria-live="polite" aria-busy={p.overridesLoading}>
            {t('schedule.window', { from: fmtDate(p.range.from), to: fmtDate(p.range.to) })}
          </span>
          <button type="button" className="adm-btn" onClick={() => p.onPage(1)}>
            {t('schedule.later')}
          </button>
          {p.onToday ? (
            <button type="button" className="adm-btn" onClick={p.onToday}>
              {t('schedule.toToday')}
            </button>
          ) : null}
        </div>
        {p.overrides.length ? (
          <ul className="adm-list" style={{ marginTop: '1.25rem' }}>
            {p.overrides.map((o) => (
              <li className="adm-row" key={o.date} data-date={o.date}>
                <div className="adm-row__main">
                  <div className="adm-row__title">{fmtDate(o.date)}</div>
                  <div className="adm-row__sub">
                    {times(o, t)}
                    {o.note?.ru ? ` · ${o.note.ru}` : ''}
                  </div>
                </div>
                <div className="adm-row__actions">
                  <button type="button" className="adm-btn" onClick={() => p.onEditOverride(o)}>
                    {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    onClick={() => p.onDeleteOverride(o)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-save__note" style={{ marginTop: '1rem' }}>
            {t('schedule.noOverrides')}
          </p>
        )}
      </section>
    </>
  );
};
