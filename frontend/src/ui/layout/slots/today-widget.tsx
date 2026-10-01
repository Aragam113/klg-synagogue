import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLang } from '@/i18n/use-lang';
import { countdownText, nextCandle, useNow } from '@/screens/schedule/model';
import '@/screens/schedule/styles';
import { useGetTodayQuery } from '@/store/api/calendar';
import { Link } from '@/ui/kit';
import { formatDate, kaliningradNow } from '@/utils/kld-time';

/**
 * Host for the bar variant: its own block right after <header class="hdr"> (header layout stays untouched).
 */
const useBarHost = (enabled: boolean) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;
    const hdr = document.querySelector('.hdr');
    if (!hdr?.parentNode) return;
    const el = document.createElement('div');
    el.className = 'tw-bar-host';
    hdr.parentNode.insertBefore(el, hdr.nextSibling);
    setHost(el);
    return () => {
      el.remove();
      setHost(null);
    };
  }, [enabled]);
  return host;
};

/**
 * «Сегодня»: date by both calendars, Kaliningrad clock, live countdown to the next candle lighting.
 * Header variant (>=1280px) and bar variant (under the header on inner pages, <1280px) are compact links to /schedule;
 * menu variant adds the parasha and a «Всё расписание» link.
 * Renders nothing while loading or when the API is down.
 */
export const TodayWidget = ({ variant }: { variant: 'header' | 'menu' | 'bar' }) => {
  const { t, lang } = useLang('calendar');
  const now = useNow();
  const { data } = useGetTodayQuery(undefined, { pollingInterval: 30 * 60 * 1000 });
  const barHost = useBarHost(variant === 'bar');
  if (!data) return null;

  const kld = kaliningradNow(now);
  const next = nextCandle(data.nextCandles, now);
  const cd = next
    ? countdownText(next.left, {
        d: t('widget.d'),
        h: t('widget.h'),
        m: t('widget.m'),
        s: t('widget.s'),
      })
    : null;

  const body = (
    <>
      <span className="tw__dates">
        <span>
          {formatDate(data.today.date, lang, { day: 'numeric', month: 'short' })}
          {' · '}
          <span className="tw__clock" title={t('widget.clock')}>
            {kld.time.slice(0, variant === 'menu' ? 8 : 5)}
          </span>
        </span>
        <span className="tw__heb">{data.today.hebrewDate}</span>
      </span>
      {next && cd ? (
        <span className="tw__candles">
          <span className="tw__label">
            {t('widget.candles')} {formatDate(next.date, lang, { day: 'numeric', month: 'short' })}{' '}
            {next.time}
          </span>
          <span className="tw__cd" data-countdown>
            {t('widget.in')} {cd}
          </span>
        </span>
      ) : null}
    </>
  );

  if (variant === 'bar') {
    return barHost
      ? createPortal(
          <Link href="/schedule" className="tw tw--bar">
            {body}
          </Link>,
          barHost
        )
      : null;
  }
  if (variant === 'header') {
    return (
      <Link href="/schedule" className={`tw tw--${variant}`}>
        {body}
      </Link>
    );
  }
  return (
    <div className="tw tw--menu" data-today-widget>
      {body}
      {data.nextShabbat.parasha ? (
        <span className="tw__dates">
          <span className="tw__label">{t('widget.parasha')}</span>
          <span>{data.nextShabbat.parasha}</span>
        </span>
      ) : null}
      <Link href="/schedule" className="tw__all">
        {t('widget.all')}
      </Link>
    </div>
  );
};
