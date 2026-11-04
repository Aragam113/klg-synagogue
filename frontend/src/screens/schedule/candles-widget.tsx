import { useMemo } from 'react';

import { SRC } from '@/config/site';
import { useLang } from '@/i18n/use-lang';
import { useGetDaysQuery } from '@/store/api/calendar';
import { Link } from '@/ui/kit';
import { addDays, formatDate, kaliningradNow } from '@/utils/kld-time';

import { type CandleBlock, candleBlocks } from './candles-model';
import { useNow } from './model';
import './styles';

/** Дней вперёд: 4 ближайших Шаббата/праздника (как виджет Chabad.org weeks=4) + запас на длинные праздники. */
const AHEAD = 34;

/** Название блока: праздники (йом-тов) или «Шаббат <глава>». */
const blockName = (b: CandleBlock, t: (k: string) => string) =>
  b.holidays.length
    ? b.holidays.join(' · ')
    : b.parasha
      ? `${t('candles.shabbat')} ${b.parasha}`
      : t('candles.shabbat');

/**
 * «Зажигание свечей в Калининграде» — свой вид виджета Chabad.org (candlelighting.js.asp) в стиле сайта:
 * ближайшие Шаббаты и праздники, у каждого — зажигание свечей и исход. Времена — Chabad.org через наш API
 * (`*` — запасной расчёт hebcal). Прошедшие блоки скрываются; ссылка на источник обязательна.
 * Тон берёт у секции (`.tone-*`): на тёмной — светлый текст, на светлой — карточки cream.
 */
export const CandlesWidget = ({ limit = 4, className }: { limit?: number; className?: string }) => {
  const { t, lang } = useLang('calendar');
  const now = useNow(60_000);
  const kld = kaliningradNow(now);
  // со вчерашнего дня: в субботу до исхода блок «пт свечи → сб исход» ещё актуален
  const from = addDays(kld.date, -1);
  const { data, isError } = useGetDaysQuery({ from, to: addDays(from, AHEAD) });

  const stamp = `${kld.date} ${kld.time.slice(0, 5)}`;
  const blocks = useMemo(
    () =>
      candleBlocks(data ?? [], limit + 1)
        .filter((b) => {
          const last = b.lines[b.lines.length - 1];
          return `${last.date} ${last.time}` > stamp;
        })
        .slice(0, limit),
    [data, limit, stamp]
  );

  if (isError && !data) return null;
  if (!data)
    return (
      <div className={['cdl', 'cdl--loading', className].filter(Boolean).join(' ')} aria-busy />
    );

  const anyFallback = blocks.some((b) => b.fallback);
  return (
    <section
      className={['cdl', className].filter(Boolean).join(' ')}
      aria-labelledby="cdl-title"
      data-candles-widget
    >
      <header className="cdl__head">
        <span className="cdl__eyebrow">{t('candles.eyebrow')}</span>
        <h3 className="cdl__title" id="cdl-title">
          {t('candles.title')}
        </h3>
      </header>
      {blocks.length ? (
        <ol className="cdl__list">
          {blocks.map((b) => (
            <li key={b.date} className={b.holidays.length ? 'cdl-card is-holiday' : 'cdl-card'}>
              <p className="cdl-card__name">{blockName(b, t)}</p>
              <dl className="cdl-card__lines">
                {b.lines.map((l) => (
                  <div key={`${l.date}-${l.kind}`} className={`cdl-line cdl-line--${l.kind}`}>
                    <dt>
                      <span className="cdl-line__label">
                        {l.kind === 'candles'
                          ? t('candles.light')
                          : l.weekday === 6
                            ? t('candles.ends')
                            : t('candles.endsHoliday')}
                      </span>
                      <span className="cdl-line__date">
                        {formatDate(l.date, lang, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                    </dt>
                    <dd>
                      {l.after ? <small>{t('col.after')} </small> : null}
                      {l.time}
                      {l.fallback ? '*' : ''}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cdl__empty">{t('candles.unavailable')}</p>
      )}
      <p className="cdl__credit">
        {t('candles.powered')}{' '}
        <Link href={lang === 'ru' ? SRC.chabadCandlesRu : SRC.chabadCandles}>Chabad.org</Link>
        {anyFallback ? <> {t('page.fallbackNote')}</> : null}
      </p>
    </section>
  );
};
