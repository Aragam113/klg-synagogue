import { useLang } from '@/i18n/use-lang';
import { MagenDavid } from '@/ui/judaica/magen-david';
import { Placeholder, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { Band, Figure, PageHero, Paras, SectionPage, SourceLink } from '../visit-shared/ui';

import type { AboutViewProps } from './model';

export const AboutView = ({ content: a, introSrc }: AboutViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="about">
      <PageHero hero={a.hero} photo="evening2024" ghost="קהילה" />
      <Band tone="cream" title={a.intro.title}>
        <Paras items={a.intro.paragraphs} />
        <SourceLink href={introSrc} />
      </Band>
      <Band tone="deep" pattern eyebrow={t('people')}>
        <div className="sx-people">
          {a.people.map((p, i) => (
            <Reveal key={p.name} delay={(i % 3) * 0.08} className="sx-person">
              <div className="sx-person__ph" aria-hidden>
                <MagenDavid size="2.4rem" strokeWidth={1} />
                <Placeholder>{t('ph.portrait')}</Placeholder>
              </div>
              <h2 className="sx-h">{p.name}</h2>
              <p className="eyebrow">{p.role}</p>
              <Text>{p.note}</Text>
              <SourceLink href={p.href} />
            </Reveal>
          ))}
        </div>
      </Band>
      <Band tone="cream" title={a.trust.title}>
        <Paras items={a.trust.paragraphs} />
        <div className="sx-gallery">
          <Figure id="eve2018" />
          <Figure id="build2017" />
        </div>
      </Band>
    </SectionPage>
  );
};
