import { useLang } from '@/i18n/use-lang';
import '@/screens/schedule/styles';
import {
  Button,
  Container,
  Empty,
  ErrorBox,
  Eyebrow,
  Link,
  Page,
  Section,
  Text,
  Title,
} from '@/ui/kit';
import { Reveal } from '@/ui/motion';
import { formatDate } from '@/utils/kld-time';

import type { HolidayViewProps } from './model';

/** /holidays/[key] — короткая страница праздника: что это и даты в этом году (hebcal). */
export const HolidayView = ({ state, holiday: h, error, onRetry }: HolidayViewProps) => {
  const { t, lang } = useLang('calendar');

  return (
    <Page title={`${h?.title ?? t('holiday.eyebrow')}`}>
      <Section tone="cream" pattern>
        <Container size="narrow">
          <Link href="/schedule" className="hol-back">
            {t('holiday.back')}
          </Link>
          {state === 'not_found' ? (
            <Empty title={t('holiday.notFound')} />
          ) : (
            <>
              <ErrorBox error={error} onRetry={onRetry} />
              {h ? (
                <Reveal>
                  <Eyebrow>{t('holiday.eyebrow')}</Eyebrow>
                  <Title as="h1" size="xl" text={h.title} italicWord={h.title} />
                </Reveal>
              ) : null}
            </>
          )}
        </Container>
      </Section>
      {h ? (
        <Section tone="canvas">
          <Container>
            <div className="hol-grid">
              <Reveal>
                <Text lead className="hol-text">
                  {h.text}
                </Text>
              </Reveal>
              <Reveal delay={0.08}>
                <Title as="h2" size="sm" text={t('holiday.dates', { year: h.year })} />
                <ul className="hol-dates">
                  {h.dates.map((d) => (
                    <li key={d.date + d.name}>
                      <span className="hol-dates__date">
                        {formatDate(d.date, lang, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span>{d.name}</span>
                    </li>
                  ))}
                </ul>
                <Text className="sch-footnote">{t('holiday.computed')}</Text>
                <Title as="h3" size="sm" text={t('holiday.inSynagogue')} />
                <Text>{t('holiday.inSynagogueText')}</Text>
                <div className="btns">
                  <Button href="/schedule" arrow>
                    {t('common:links.schedule')}
                  </Button>
                  <Button href="/events" variant="ghost">
                    {t('holiday.events')}
                  </Button>
                </div>
              </Reveal>
            </div>
          </Container>
        </Section>
      ) : null}
    </Page>
  );
};
