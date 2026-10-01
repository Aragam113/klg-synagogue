import { useAdminT } from '@/screens/admin/shared/gate';
import { AdmError, Chip, Head, Pager } from '@/screens/admin/shared/ui';
import type { AdminPayment, AdminRecurring } from '@/store/api/admin-payments';
import { Empty, Select } from '@/ui/kit';
import { fmtDateTime } from '@/utils/kld-time';

export const PURPOSES = ['donation', 'prayer', 'event'] as const;
export const PAY_STATUSES = ['pending', 'paid', 'canceled', 'failed'] as const;

const rub = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

export interface PaymentsViewProps {
  tab: 'payments' | 'recurring';
  onTab: (t: 'payments' | 'recurring') => void;
  purpose: string;
  status: string;
  onFilter: (f: { purpose?: string; status?: string }) => void;
  items: AdminPayment[];
  total: number;
  page: number;
  limit: number;
  onPage: (p: number) => void;
  recurring: AdminRecurring[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onDedication: (p: AdminPayment, visible: boolean) => void;
  pendingId?: string;
}

/** Платежи (статус, сумма, сбор, посвящение + модерация) и ежемесячные подписки. */
export const PaymentsView = (p: PaymentsViewProps) => {
  const t = useAdminT();
  const any = { value: '', label: t('common.all') };
  return (
    <>
      <Head title={t('nav.payments')} />
      <div className="adm-tabs" role="tablist">
        {(['payments', 'recurring'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className="adm-tab"
            aria-selected={p.tab === k}
            onClick={() => p.onTab(k)}
          >
            {t(`payments.tab.${k}`)}
          </button>
        ))}
      </div>
      <AdmError error={p.error} onRetry={p.onRetry} />
      {p.loading ? <p className="adm-save__note">{t('common.loading')}</p> : null}
      {p.tab === 'payments' ? (
        <>
          <div className="adm-filters">
            <Select
              label={t('fields.purpose')}
              value={p.purpose}
              onChange={(purpose) => p.onFilter({ purpose })}
              options={[any, ...PURPOSES.map((v) => ({ value: v, label: t(`purpose.${v}`) }))]}
            />
            <Select
              label={t('fields.status')}
              value={p.status}
              onChange={(status) => p.onFilter({ status })}
              options={[
                any,
                ...PAY_STATUSES.map((v) => ({ value: v, label: t(`payStatus.${v}`) })),
              ]}
            />
          </div>
          {!p.loading && !p.error && !p.items.length ? (
            <Empty title={t('payments.empty')} text={t('payments.emptyText')} />
          ) : null}
          <ul className="adm-list" data-testid="list-payments">
            {p.items.map((x) => (
              <li className="adm-row" key={x.id} data-id={x.id}>
                <div className="adm-row__main">
                  <div className="adm-row__title">
                    {rub(x.amountRub)} · {t(`purpose.${x.purpose}`)}
                    {x.recurring ? ` · ${t('payments.monthly')}` : ''}
                  </div>
                  <div className="adm-row__sub">
                    {[
                      fmtDateTime(x.paidAt ?? x.createdAt),
                      x.anonymous ? t('payments.anonymous') : x.donorName,
                      x.email,
                      x.phone,
                      x.fundraiser ? `${t('payments.fundraiser')}: ${x.fundraiser.title}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {x.comment ? <div className="adm-row__sub">{x.comment}</div> : null}
                  {x.dedication ? (
                    <div className="adm-row__sub" data-testid="dedication">
                      «{x.dedication}»
                    </div>
                  ) : null}
                </div>
                <Chip value={x.status}>{t(`payStatus.${x.status}`)}</Chip>
                {x.dedication ? (
                  <button
                    type="button"
                    className={`adm-btn${x.dedicationVisible ? '' : ' adm-btn--primary'}`}
                    disabled={p.pendingId === x.id}
                    onClick={() => p.onDedication(x, !x.dedicationVisible)}
                  >
                    {x.dedicationVisible ? t('payments.hide') : t('payments.show')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <Pager page={p.page} total={p.total} limit={p.limit} onPage={p.onPage} />
        </>
      ) : (
        <>
          {!p.loading && !p.error && !p.recurring.length ? (
            <Empty title={t('payments.recurringEmpty')} text={t('payments.emptyText')} />
          ) : null}
          <ul className="adm-list" data-testid="list-recurring">
            {p.recurring.map((r) => (
              <li className="adm-row" key={r.id}>
                <div className="adm-row__main">
                  <div className="adm-row__title">
                    {rub(r.amountRub)} / {t('payments.month')}
                  </div>
                  <div className="adm-row__sub">
                    {[r.email, fmtDateTime(r.createdAt)].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Chip value={r.status}>{t(`recStatus.${r.status}`)}</Chip>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
};
