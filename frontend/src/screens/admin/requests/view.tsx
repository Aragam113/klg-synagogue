import { type FormEvent } from 'react';

import { AdmLink, useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, Chip, Head, Pager } from '@/screens/admin/shared/ui';
import type { AdminRequest, RequestStatus } from '@/store/api/admin-requests';
import { Empty, Field, Link, Select } from '@/ui/kit';
import { fmtDateTime } from '@/utils/kld-time';

import { payloadEntries, REQUEST_STATUSES, REQUEST_TYPES, type RequestFilters } from './model';

export interface RequestsViewProps {
  filters: RequestFilters;
  onFilter: (f: Partial<RequestFilters>) => void;
  items: AdminRequest[];
  total: number;
  limit: number;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

export const RequestsView = (p: RequestsViewProps) => {
  const t = useAdminT();
  const any = { value: '', label: t('common.all') };
  return (
    <>
      <Head title={t('nav.requests')} />
      <div className="adm-filters">
        <Select
          label={t('fields.type')}
          name="type"
          value={p.filters.type}
          onChange={(type) => p.onFilter({ type, page: 1 })}
          options={[any, ...REQUEST_TYPES.map((v) => ({ value: v, label: t(`reqType.${v}`) }))]}
        />
        <Select
          label={t('fields.status')}
          name="status"
          value={p.filters.status}
          onChange={(status) => p.onFilter({ status, page: 1 })}
          options={[
            any,
            ...REQUEST_STATUSES.map((v) => ({ value: v, label: t(`reqStatus.${v}`) })),
          ]}
        />
      </div>
      <AdmError error={p.error} onRetry={p.onRetry} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {!p.loading && !p.error && !p.items.length ? (
        <Empty title={t('requests.empty')} text={t('requests.emptyText')} />
      ) : null}
      {p.items.length ? (
        <ul className="adm-list" data-testid="list-requests">
          {p.items.map((r) => (
            <li className="adm-row" key={r.id} data-id={r.id}>
              <div className="adm-row__main">
                <AdmLink href={`/admin/requests/${r.id}`} className="adm-row__title">
                  {t(`reqType.${r.type}`)} · {r.contactName || t('common.noName')}
                </AdmLink>
                <div className="adm-row__sub">
                  {[fmtDateTime(r.createdAt), r.contactPhone, r.contactEmail]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <Chip value={r.status}>{t(`reqStatus.${r.status}`)}</Chip>
            </li>
          ))}
        </ul>
      ) : null}
      <Pager
        page={p.filters.page}
        total={p.total}
        limit={p.limit}
        onPage={(page) => p.onFilter({ page })}
      />
    </>
  );
};

export interface RequestCardViewProps {
  request?: AdminRequest;
  loading: boolean;
  error: unknown;
  status: RequestStatus;
  note: string;
  onStatus: (s: RequestStatus) => void;
  onNote: (s: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  saveError: unknown;
}

export const RequestCardView = (p: RequestCardViewProps) => {
  const t = useAdminT();
  const r = p.request;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    p.onSave();
  };
  const label = (k: string) => t(`payload.${k}`, { defaultValue: k });
  return (
    <>
      <Head
        title={r ? `${t(`reqType.${r.type}`)} №${r.id.slice(0, 8)}` : t('nav.requests')}
        back={{ href: '/admin/requests', label: t('nav.requests') }}
      />
      <AdmError error={p.error} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {r ? (
        <>
          <section className="adm-panel" data-testid="request-card">
            <dl className="adm-dl">
              <dt>{t('fields.createdAt')}</dt>
              <dd>{fmtDateTime(r.createdAt)}</dd>
              <dt>{t('fields.contactName')}</dt>
              <dd>{r.contactName || '—'}</dd>
              <dt>{t('fields.phone')}</dt>
              <dd>
                {r.contactPhone ? (
                  <Link href={`tel:${r.contactPhone}`}>{r.contactPhone}</Link>
                ) : (
                  '—'
                )}
              </dd>
              <dt>{t('fields.email')}</dt>
              <dd>
                {r.contactEmail ? (
                  <Link href={`mailto:${r.contactEmail}`}>{r.contactEmail}</Link>
                ) : (
                  '—'
                )}
              </dd>
              {payloadEntries(r.payload).map(([k, v]) => (
                <Row key={k} k={label(k)} v={v} />
              ))}
              {payloadEntries(r.reminder ?? {})
                .filter(([k]) => !/^(id|requestId|createdAt|hebrewDay|hebrewMonth)$/.test(k))
                .map(([k, v]) => (
                  <Row key={`rem.${k}`} k={`${t('requests.reminder')}: ${label(k)}`} v={v} />
                ))}
            </dl>
          </section>
          <form className="adm-panel adm-grid" onSubmit={submit} noValidate>
            <Select
              label={t('fields.status')}
              name="status"
              value={p.status}
              onChange={(v) => p.onStatus(v as RequestStatus)}
              options={REQUEST_STATUSES.map((v) => ({ value: v, label: t(`reqStatus.${v}`) }))}
            />
            <Field
              label={t('fields.adminNote')}
              name="adminNote"
              multiline
              value={p.note}
              onChangeText={p.onNote}
              hint={t('hints.adminNote')}
            />
            <AdmError error={p.saveError} />
            <div className="adm-row__actions">
              <button
                type="submit"
                className="adm-btn adm-btn--primary"
                disabled={p.saving || !p.dirty}
                data-testid="save"
              >
                {p.saving ? t('common.saving') : t('common.save')}
              </button>
              {p.saved && !p.dirty ? <span className="adm-ok">{t('common.saved')}</span> : null}
            </div>
          </form>
        </>
      ) : null}
    </>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <>
    <dt>{k}</dt>
    <dd>{v}</dd>
  </>
);
