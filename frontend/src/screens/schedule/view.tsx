import type { TFunction } from 'i18next';

import { useLang } from '@/i18n/use-lang';
import type { Day, Zmanim } from '@/store/api/calendar';
import {
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  Link,
  Page,
  Placeholder,
  Section,
  Select,
  Text,
  Title,
} from '@/ui/kit';
import { CONTACTS } from '@/ui/layout/slots/contacts';
import { Reveal } from '@/ui/motion';
import { formatDate, monthOfDay } from '@/utils/kld-time';

import { type ScheduleMode, type ScheduleViewProps, serviceLabelKey } from './model';
import './styles';

const ZMANIM: (keyof Zmanim)[] = [
  'alot',
  'talit',
  'sunrise',
  'shma',
  'tfila',
  'chatzot',
  'shkia',
  'tzet',
];
const SERVICES = ['shacharit', 'mincha', 'maariv'] as const;

/** «Время молитвы уточняйте по телефону» + телефон из контактов или видимая заглушка. */
export const ServicesUnknown = ({ t }: { t: TFunction }) => (
  <p className="sch-unknown">
    {t('page.servicesUnknown')}
    {': '}
    {CONTACTS.phone ? (
      <Link href={`tel:${CONTACTS.phone.replace(/[^\d+]/g, '')}`}>{CONTACTS.phone}</Link>
    ) : (
      <Placeholder>{t('page.phonePlaceholder')}</Placeholder>
    )}
  </p>
);

/** Примечание дня, если оно не повторяет главу и названия праздников. */
const extraNote = (d: Day) =>
  d.note && d.note !== d.parasha && !d.holidays.some((h) => h.name === d.note) ? d.note : null;

const dayClass = (d: Day, today: string) =>
  ['sch-day', d.date === today && 'is-today', d.weekday === 6 && 'is-shabbat']
    .filter(Boolean)
    .join(' ');

const Holidays = ({ d }: { d: Day }) =>
  d.holidays.length ? (
    <span className="sch-hols">
      {d.holidays.map((h) =>
        h.link ? (
          <Link key={h.key + h.name} href={`/holidays/${h.key}`} className="sch-hol sch-hol--link">
            {h.name}
          </Link>
        ) : (
          <span key={h.key + h.name} className={`sch-hol${h.yomTov ? ' sch-hol--yt' : ''}`}>
            {h.name}
          </span>
        )
      )}
    </span>
  ) : null;

const DayCard = ({
  d,
  today,
  lang,
  t,
  zmanim,
}: {
  d: Day;
  today: string;
  lang: string;
  t: TFunction;
  zmanim: boolean;
}) => (
  <article className={dayClass(d, today)} data-date={d.date}>
    <div className="sch-day__date">
      <span className="sch-day__wd">{formatDate(d.date, lang, { weekday: 'long' })}</span>
      <span className="sch-day__num">{formatDate(d.date, lang, { day: 'numeric' })}</span>
      <span className="sch-day__month">{monthOfDay(d.date, lang)}</span>
      {d.date === today ? <span className="sch-tag">{t('page.today')}</span> : null}
    </div>
    <div className="sch-day__main">
      <p className="sch-day__heb">{d.hebrewDate}</p>
      {d.parasha ? (
        <p className="sch-day__parasha">
          {t('col.parasha')}: {d.parasha}
        </p>
      ) : null}
      <Holidays d={d} />
      {extraNote(d) ? <p className="sch-day__note">{extraNote(d)}</p> : null}
      {d.closed ? <p className="sch-day__closed">{t('page.closed')}</p> : null}
      {zmanim ? (
        <dl className="sch-zmanim">
          {ZMANIM.map((k) => (
            <div key={k}>
              <dt>{t(`zmanim.${k}`)}</dt>
              <dd>{d.zmanim[k] ?? '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
    <dl className="sch-day__times">
      {d.services ? (
        SERVICES.filter((s) => d.services?.[s]).map((s) => (
          <div key={s}>
            <dt>{t(serviceLabelKey(s, d.weekday))}</dt>
            <dd>{d.services?.[s]}</dd>
          </div>
        ))
      ) : (
        <div className="sch-day__ask">
          <dd>{t('page.servicesUnknown')}</dd>
        </div>
      )}
      {d.candleLighting ? (
        <div className="sch-gold">
          <dt>{t('col.candles')}</dt>
          <dd>{d.candleLighting}</dd>
        </div>
      ) : null}
      {d.havdalah ? (
        <div className="sch-gold">
          <dt>{t('col.havdalah')}</dt>
          <dd>{d.havdalah}</dd>
        </div>
      ) : null}
    </dl>
  </article>
);

const DayTable = ({
  days,
  today,
  lang,
  t,
  zmanim,
}: {
  days: Day[];
  today: string;
  lang: string;
  t: TFunction;
  zmanim: boolean;
}) => (
  <div className="sch-table-wrap">
    <table className="sch-table">
      <thead>
        <tr>
          <th>{t('col.date')}</th>
          <th>{t('col.hebrew')}</th>
          {SERVICES.map((s) => (
            <th key={s}>{t(`col.${s}`)}</th>
          ))}
          <th>{t('col.candles')}</th>
          <th>{t('col.havdalah')}</th>
          <th>{t('col.note')}</th>
          {zmanim ? ZMANIM.map((k) => <th key={k}>{t(`zmanim.${k}`)}</th>) : null}
        </tr>
      </thead>
      <tbody>
        {days.map((d) => (
          <tr key={d.date} className={dayClass(d, today)} data-date={d.date}>
            <td className="sch-table__date">
              {formatDate(d.date, lang, { weekday: 'short', day: 'numeric', month: 'short' })}
            </td>
            <td>{d.hebrewDate}</td>
            {SERVICES.map((s) => (
              <td key={s} title={d.services ? undefined : t('page.servicesUnknown')}>
                {d.services?.[s] ?? '—'}
                {d.services?.[s] && serviceLabelKey(s, d.weekday) !== `col.${s}` ? (
                  <span className="sch-table__label">{t(serviceLabelKey(s, d.weekday))}</span>
                ) : null}
              </td>
            ))}
            <td className="sch-gold">{d.candleLighting ?? ''}</td>
            <td className="sch-gold">{d.havdalah ?? ''}</td>
            <td>
              {d.parasha ? <span className="sch-day__parasha">{d.parasha} </span> : null}
              <Holidays d={d} />
              {extraNote(d) ? <span> {extraNote(d)}</span> : null}
            </td>
            {zmanim ? ZMANIM.map((k) => <td key={k}>{d.zmanim[k] ?? '—'}</td>) : null}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** /schedule — расписание молитв и еврейский календарь Калининграда. */
export const ScheduleView = (m: ScheduleViewProps) => {
  const { t, lang } = useLang('calendar');
  const anyUnknown = m.days.some((d) => !d.services);
  const views: ScheduleMode[] = ['list', 'table'];

  return (
    <Page title={`${t('page.title')}`}>
      <Section tone="cream" pattern className="sch-hero">
        <Container>
          <Reveal>
            <Eyebrow>{t('page.eyebrow')}</Eyebrow>
            <Title
              as="h1"
              size="xl"
              text={t('page.title')}
              italicWord={t('page.italic')}
              stroke="reveal"
            />
            <Text lead>{t('page.lead')}</Text>
          </Reveal>
        </Container>
      </Section>

      <Section tone="canvas" className="sch">
        <Container>
          <div className="sch-controls">
            <div className="sch-controls__period">
              <Select
                name="month"
                label={t('page.month')}
                value={m.month}
                onChange={m.onMonth}
                options={m.monthOptions}
              />
              <Select
                name="year"
                label={t('page.year')}
                value={m.year}
                onChange={m.onYear}
                options={m.yearOptions}
              />
            </div>
            <div className="sch-controls__view" role="group">
              {views.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="sch-toggle"
                  aria-pressed={m.mode === v}
                  data-view={v}
                  onClick={() => m.onMode(v)}
                >
                  {t(`page.${v}`)}
                </button>
              ))}
              <button
                type="button"
                className="sch-toggle sch-toggle--zmanim"
                aria-pressed={m.zmanim}
                onClick={m.onToggleZmanim}
              >
                {t(m.zmanim ? 'page.hideZmanim' : 'page.showZmanim')}
              </button>
            </div>
          </div>

          {anyUnknown ? <ServicesUnknown t={t} /> : null}
          <ErrorBox error={m.error} onRetry={m.onRetry} />

          {m.loading && !m.days.length ? (
            <div className="sch-loading" aria-busy />
          ) : !m.error && !m.days.length ? (
            <Empty title={t('page.empty')} />
          ) : m.mode === 'table' ? (
            <DayTable days={m.days} today={m.today} lang={lang} t={t} zmanim={m.zmanim} />
          ) : (
            <div className="sch-list" data-loading={m.loading || undefined}>
              {m.days.map((d) => (
                <DayCard key={d.date} d={d} today={m.today} lang={lang} t={t} zmanim={m.zmanim} />
              ))}
            </div>
          )}
          <p className="sch-footnote">{t('page.computedNote')}</p>
        </Container>
      </Section>
    </Page>
  );
};
