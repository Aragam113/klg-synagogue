/**
 * SLOT owned by task 07 (payments): replace this file entirely with the real «Оплатить / Пожертвовать» block.
 * Rendered by <RequestAccepted> under the request number:
 *   - prayer request → `{purpose:'prayer', requestId, prayerType, months?}` (donation optional; Kaddish: months × tariff);
 *   - paid event registration → `{purpose:'event', registrationId, eventId, seats}`.
 * Free forms (excursion, appointment, help…) never render it.
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
}

export const PaymentSlot = (_props: PaymentSlotProps) => null;
