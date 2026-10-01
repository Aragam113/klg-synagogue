import { EventRegistrationForm } from '@/forms/event-registration-form';
import { useLang } from '@/i18n/use-lang';
import '@/screens/donate/styles';
import { formatRub } from '@/screens/events/content-model';
import type { EventItem } from '@/store/api/content';
import { Text, Title } from '@/ui/kit';

/**
 * Registration on the event card, inside the `#register` anchor: free → registration only;
 * paid → registration, then payment of today's ticket price × seats (the amount is counted by the server).
 */
export const EventRegisterSlot = ({ event }: { event: EventItem }) => {
  const { t, lang } = useLang('content');
  return (
    <>
      <Title as="h2" size="md" text={event.isPaid ? t('events.buy') : t('events.register')} />
      {event.isPaid && event.priceNow !== null ? (
        <Text>
          {t('events.price')}:{' '}
          <b data-price-now={event.priceNow}>{formatRub(event.priceNow, lang)}</b>
        </Text>
      ) : null}
      <EventRegistrationForm
        slug={event.slug}
        eventId={event.id}
        isPaid={event.isPaid}
        priceRub={event.priceNow}
      />
    </>
  );
};
