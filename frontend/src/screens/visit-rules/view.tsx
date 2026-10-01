import { useLang } from '@/i18n/use-lang';
import { Button, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { num } from '../visit-shared/model';
import { Band, PageHero, Paras, SectionPage, SourceLink } from '../visit-shared/ui';

import type { RulesViewProps } from './model';

export const RulesView = ({ content: r, shabbatSrc }: RulesViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="rules">
      <PageHero hero={r.hero} photo="domeSky" ghost="שבת שלום" />
      <Band tone="cream">
        <div className="sx-list">
          {r.items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.06} className="sx-list__item">
              <span className="sx-card__num">{num(i)}</span>
              <h2 className="sx-h">{it.title}</h2>
              <Text>{it.text}</Text>
            </Reveal>
          ))}
        </div>
      </Band>
      <Band tone="ink" pattern eyebrow={r.shabbat.title}>
        <Paras items={r.shabbat.paragraphs} />
        <p className="sx-alt">
          <SourceLink href={shabbatSrc} />
        </p>
        <Button variant="light" href="/schedule" arrow>
          {t('toSchedule')}
        </Button>
      </Band>
    </SectionPage>
  );
};
