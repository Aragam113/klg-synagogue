import { useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, Chip, CsvButton } from '@/screens/admin/shared/ui';
import {
  type RegistrationStatus,
  useAdminPatchRegistrationMutation,
  useAdminRegistrationsQuery,
} from '@/store/api/admin-requests';
import { Select } from '@/ui/kit';
import { fmtDateTime } from '@/utils/kld-time';

const STATUSES: RegistrationStatus[] = ['new', 'confirmed', 'canceled'];

/** Вкладка «Регистрации» в карточке события + CSV. */
export const EventRegistrations = ({ eventId, slug }: { eventId: string; slug: string }) => {
  const t = useAdminT();
  const q = useAdminRegistrationsQuery(eventId);
  const [patch, pst] = useAdminPatchRegistrationMutation();
  const rows = q.data ?? [];
  const seats = rows.filter((r) => r.status !== 'canceled').reduce((s, r) => s + r.seats, 0);
  return (
    <section className="adm-panel" data-testid="registrations">
      <div className="adm-head">
        <h2>
          {t('registrations.title')} · {rows.length} / {t('registrations.seats', { count: seats })}
        </h2>
        <CsvButton
          path={`/admin/events/${eventId}/registrations.csv`}
          filename={`registrations-${slug || eventId}.csv`}
        />
      </div>
      <AdmError error={q.error ?? pst.error} onRetry={q.refetch} />
      {!q.isLoading && !rows.length ? (
        <p className="adm-save__note">{t('registrations.empty')}</p>
      ) : null}
      <ul className="adm-list">
        {rows.map((r) => (
          <li className="adm-row" key={r.id}>
            <div className="adm-row__main">
              <div className="adm-row__title">{r.name}</div>
              <div className="adm-row__sub">
                {r.phone} · {r.email} · {fmtDateTime(r.createdAt)}
              </div>
            </div>
            <div className="adm-row__meta">
              <span>{t('registrations.seats', { count: r.seats })}</span>
              {r.paymentId ? <Chip value="paid">{t('registrations.withPayment')}</Chip> : null}
            </div>
            <Select
              label={t('fields.status')}
              value={r.status}
              onChange={(v) => patch({ id: r.id, status: v as RegistrationStatus })}
              options={STATUSES.map((s) => ({ value: s, label: t(`regStatus.${s}`) }))}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
