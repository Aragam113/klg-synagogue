import { useLang } from '@/i18n/use-lang';
import { eventTotal, kaddishTotal } from '@/screens/donate/donate-model';
import { DonationForm } from '@/screens/donate/donation-form';
import { formatRub } from '@/screens/events/content-model';
import { useGetPublicSettingsQuery } from '@/store/api/content';
import { Title } from '@/ui/kit';

/**
 * Payment block under «Заявка принята»:
 *   - prayer request → `{purpose:'prayer', requestId, prayerType, months?}` — optional donation;
 *     Kaddish with a tariff in settings → amount = months × tariff (the server counts it again);
 *   - paid event registration → `{purpose:'event', registrationId, eventId, seats}` — the server takes
 *     today's ticket price × seats, the client sends no amount.
 */
export interface PaymentSlotProps {
  purpose: 'prayer' | 'event';
  requestId?: string;
  registrationId?: string;
  prayerType?: 'misheberah' | 'kaddish' | 'yahrzeit' | 'yizkor';
  /** Kaddish: months to read. */
  months?: number;
  eventId?: string;
  seats?: number;
  /** Event: today's ticket price (display only — the server counts the amount itself). */
  priceRub?: number | null;
}

export const PaymentSlot = ({
  purpose,
  requestId,
  registrationId,
  prayerType,
  months,
  seats,
  priceRub,
}: PaymentSlotProps) => {
  const { t, lang } = useLang('payments');
  const settings = useGetPublicSettingsQuery({ lang }, { skip: purpose !== 'prayer' });

  if (purpose === 'event') {
    const ticket = eventTotal(seats, priceRub);
    return (
      <div className="don-slot" data-payment-slot="event">
        <Title as="h3" size="sm" text={t('slot.event')} />
        <DonationForm
          ctx={{ purpose: 'event', registrationId }}
          fixed={
            ticket && priceRub ? (
              <span data-event-total={ticket}>
                {t('form.eventTotal', {
                  seats,
                  price: formatRub(priceRub, lang),
                  total: formatRub(ticket, lang),
                })}
              </span>
            ) : (
              <span className="don-fixed__note">{t('form.eventNote')}</span>
            )
          }
        />
      </div>
    );
  }

  const tariff = settings.data?.kaddishMonthRub ?? null;
  const total = prayerType === 'kaddish' ? kaddishTotal(months, tariff) : null;
  return (
    <div className="don-slot" data-payment-slot="prayer">
      <Title as="h3" size="sm" text={t('slot.prayer')} />
      <DonationForm
        ctx={{ purpose: 'prayer', requestId }}
        initialAmount={360}
        fixed={
          total && tariff
            ? t('form.kaddish', {
                months,
                tariff: formatRub(tariff, lang),
                total: formatRub(total, lang),
              })
            : undefined
        }
      />
    </div>
  );
};
