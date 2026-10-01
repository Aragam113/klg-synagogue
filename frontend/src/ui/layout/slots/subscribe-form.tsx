import { useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { Button } from '@/ui/kit/button';

/**
 * SLOT owned by task 05 (forms): replace with the real POST /subscribe form (name, email, lives_in_city, consent).
 * Stub: looks real, sends nothing and says that subscription is coming soon.
 */
export const SubscribeForm = () => {
  const { t } = useLang();
  const [sent, setSent] = useState(false);
  return (
    <form
      className="subscribe"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <input
        className="subscribe__input"
        type="email"
        placeholder={t('footer.subscribeEmail')}
        aria-label={t('footer.subscribeEmail')}
      />
      <Button type="submit" variant="light">
        {t('footer.subscribeCta')}
      </Button>
      {sent ? <p className="subscribe__note">{t('footer.subscribeSoon')}</p> : null}
    </form>
  );
};
