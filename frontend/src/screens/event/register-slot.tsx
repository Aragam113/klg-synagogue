import { useLang } from '@/i18n/use-lang';
import type { EventItem } from '@/store/api/content';
import { Text, Title } from '@/ui/kit';

/**
 * SLOT owned by task 07 (регистрация/билеты): замени файл целиком на форму
 * `POST /events/:slug/register` (+ оплата для платных). Рендерится внутри якоря `id="register"`.
 */
export const EventRegisterSlot = ({ event }: { event: EventItem }) => {
  const { t } = useLang('content');
  return (
    <>
      <Title as="h2" size="md" text={event.isPaid ? t('events.buy') : t('events.register')} />
      <Text>{t('events.registerSoon')}</Text>
    </>
  );
};
