import { useLang } from '@/i18n/use-lang';
import { Button, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { num } from '../visit-shared/model';
import {
  Band,
  CardGrid,
  Facts,
  PageHero,
  Paras,
  PhoneFact,
  QuoteBlock,
  SectionPage,
  SourceLink,
} from '../visit-shared/ui';

import type { CommunityViewProps } from './model';

export const CommunityView = (p: CommunityViewProps) => {
  const { t } = useLang('sections');
  const m = p.content;
  return (
    <SectionPage titleKey="community">
      <PageHero hero={m.hero} photo="facade2019" ghost="קהילה" />
      <Band tone="cream">
        <QuoteBlock quote={m.intro} />
        <CardGrid cards={m.cards} />
      </Band>
      <Band tone="deep" pattern eyebrow={t('programs')}>
        <div className="sx-list">
          {m.programs.map((pr, i) => (
            <Reveal key={pr.title} delay={i * 0.06} className="sx-list__item">
              <span className="sx-card__num">{num(i)}</span>
              <h2 className="sx-h">{pr.title}</h2>
              <p className="eyebrow">{pr.when}</p>
              <Text>{pr.text}</Text>
              <SourceLink href={pr.href} />
            </Reveal>
          ))}
        </div>
        <Button variant="light" href="/programs" arrow>
          {t('allPrograms')}
        </Button>
      </Band>
      <Band tone="cream">
        <div className="sx-cols">
          {m.reception.map((r, i) => (
            <Reveal key={r.title} className="sx-panel" delay={i * 0.08}>
              <h2 className="sx-h">{r.title}</h2>
              <Paras items={r.paragraphs} />
              {p.receptionPhones[i] ? <PhoneFact fact={p.receptionPhones[i]} /> : null}
            </Reveal>
          ))}
          <Reveal className="sx-panel" delay={0.16}>
            <h2 className="sx-h">{t('shabbatServices')}</h2>
            <Facts
              rows={[
                [t('kabbalat'), p.shabbat.kabbalat],
                [t('shacharit'), p.shabbat.shacharit],
              ]}
            />
            <SourceLink href={p.shabbatSrc} />
            <div className="btns">
              <Button variant="primary" href="/appointment" arrow>
                {t('bookAppointment')}
              </Button>
            </div>
          </Reveal>
        </div>
      </Band>
      <Band tone="ink" pattern title={m.partners.title}>
        <Paras items={m.partners.paragraphs} />
        <p className="sx-alt">
          {p.partnerSrcs.map((s, i) => (
            <span key={s}>
              {i ? ' · ' : null}
              <SourceLink href={s} />
            </span>
          ))}
        </p>
      </Band>
    </SectionPage>
  );
};
