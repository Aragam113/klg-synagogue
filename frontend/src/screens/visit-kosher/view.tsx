import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Reveal } from '@/ui/motion';

import {
  Band,
  Facts,
  PageHero,
  Paras,
  PhoneFact,
  SectionPage,
  SourceLink,
} from '../visit-shared/ui';

import type { KosherViewProps } from './model';

export const KosherView = (p: KosherViewProps) => {
  const { t } = useLang('sections');
  const k = p.content;
  return (
    <SectionPage titleKey="kosher">
      <PageHero
        hero={k.hero}
        photo="evening2024"
        ghost={[GW.kasher, GW.shabbat, GW.kehila, GW.chesed, GW.shalom]}
      />
      <Band tone="cream" title={k.about.title}>
        <Paras items={k.about.paragraphs} />
        <p className="sx-alt">
          {p.aboutSrcs.map((s, i) => (
            <span key={s}>
              {i ? ' · ' : null}
              <SourceLink href={s} />
            </span>
          ))}
        </p>
      </Band>
      <Band tone="deep" pattern title={k.groups.title}>
        <div className="sx-cols">
          <Reveal className="sx-panel">
            <Paras items={k.groups.paragraphs} />
            <PhoneFact fact={p.phone} />
          </Reveal>
          <Reveal className="sx-panel" delay={0.08}>
            <h2 className="sx-h">{t('page.hours')}</h2>
            <Facts
              rows={[
                [t('days.sunThu'), p.hours.sunThu],
                [t('days.fri'), p.hours.fri],
                [t('days.sat'), t('days.closed')],
              ]}
            />
            <SourceLink href={p.hoursSrc} />
          </Reveal>
        </div>
      </Band>
    </SectionPage>
  );
};
