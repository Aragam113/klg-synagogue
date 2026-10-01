import { useEffect, useState } from 'react';

import { useLang } from '@/i18n/use-lang';
import { Button } from '@/ui/kit/button';
import { Link } from '@/ui/kit/link';

export const COOKIE_KEY = 'synagogue.cookieConsent';

const read = () => {
  try {
    return window.localStorage.getItem(COOKIE_KEY);
  } catch {
    return '1';
  }
};

/** Small cookie notice, remembered in localStorage. */
export const CookieBanner = () => {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(read() !== '1'), []);
  if (!show) return null;
  const accept = () => {
    try {
      window.localStorage.setItem(COOKIE_KEY, '1');
    } catch {
      /* storage blocked: just hide for this visit */
    }
    setShow(false);
  };
  return (
    <div className="cookie tone-ink" role="region" aria-label="cookie">
      <p>
        {t('cookie.text')}{' '}
        <Link href="/privacy" className="cookie__more">
          {t('cookie.more')}
        </Link>
      </p>
      <Button variant="light" onPress={accept}>
        {t('cookie.ok')}
      </Button>
    </div>
  );
};
