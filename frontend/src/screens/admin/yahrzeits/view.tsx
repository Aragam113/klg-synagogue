import { AdmLink, useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, Chip, fmtDate, Head } from '@/screens/admin/shared/ui';
import type { Subscriber, Yahrzeit } from '@/store/api/admin-requests';
import { Empty } from '@/ui/kit';

/** Предстоящие годовщины (30 дней) — из заявок «Йорцайт» с напоминанием. */
export const YahrzeitsView = (p: {
  items: Yahrzeit[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) => {
  const t = useAdminT();
  return (
    <>
      <Head title={t('nav.yahrzeits')} />
      <p className="adm-save__note">{t('yahrzeits.lead')}</p>
      <AdmError error={p.error} onRetry={p.onRetry} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {!p.loading && !p.error && !p.items.length ? (
        <Empty title={t('yahrzeits.empty')} text={t('yahrzeits.emptyText')} />
      ) : null}
      <ul className="adm-list" data-testid="list-yahrzeits">
        {p.items.map((y) => (
          <li className="adm-row" key={y.reminderId}>
            <div className="adm-row__main">
              <div className="adm-row__title">
                {y.deceasedName}
                {y.fatherName ? ` ${t('yahrzeits.sonOf')} ${y.fatherName}` : ''}
              </div>
              <div className="adm-row__sub">
                {t('yahrzeits.death')}: {fmtDate(y.deathDate)} ·{' '}
                {[y.byEmail && y.email, y.byPhone && y.phone].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <Chip value={y.daysLeft <= 7 ? 'new' : 'neutral'}>
              {fmtDate(y.anniversary)} · {t('yahrzeits.daysLeft', { count: y.daysLeft })}
            </Chip>
            <AdmLink href={`/admin/requests/${y.requestId}`}>{t('yahrzeits.request')}</AdmLink>
          </li>
        ))}
      </ul>
    </>
  );
};

/** Подписчики рассылки + CSV. */
export const SubscribersView = (p: {
  items: Subscriber[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  csv: React.ReactNode;
}) => {
  const t = useAdminT();
  return (
    <>
      <Head title={`${t('nav.subscribers')} · ${p.items.length}`}>{p.csv}</Head>
      <AdmError error={p.error} onRetry={p.onRetry} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {!p.loading && !p.error && !p.items.length ? (
        <Empty title={t('subscribers.empty')} text={t('subscribers.emptyText')} />
      ) : null}
      <ul className="adm-list" data-testid="list-subscribers">
        {p.items.map((s) => (
          <li className="adm-row" key={s.id}>
            <div className="adm-row__main">
              <div className="adm-row__title">{s.email}</div>
              <div className="adm-row__sub">
                {[s.name, fmtDate(s.createdAt)].filter(Boolean).join(' · ')}
              </div>
            </div>
            {s.livesInCity ? <Chip value="active">{t('subscribers.local')}</Chip> : null}
          </li>
        ))}
      </ul>
    </>
  );
};
