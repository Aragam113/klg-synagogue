import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Button } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { Band, Facts, PageHero, Paras, SectionPage, SourceLink } from '../visit-shared/ui';

import type { HoursViewProps } from './model';

export const HoursView = (p: HoursViewProps) => {
  const { t } = useLang('sections');
  const h = p.content;
  return (
    <SectionPage titleKey="hours">
      <PageHero
        hero={h.hero}
        photo="facade2019b"
        ghost={[GW.beitKnesset, GW.shabbat, GW.tfila, GW.shalom, GW.kehila, GW.torah]}
      />
      <Band tone="cream">
        <div className="sx-cols">
          <Reveal className="sx-panel">
            <h2 className="sx-h">{h.synagogue.title}</h2>
            <Paras items={h.synagogue.paragraphs} />
            <Facts
              rows={[
                [
                  t('days.daily'),
                  <span key="s" className="sx-chips">
                    {p.slots.map((s) => (
                      <span key={s} className="sx-chip">
                        {s}
                      </span>
                    ))}
                  </span>,
                ],
                [t('days.sat'), t('days.closed')],
              ]}
            />
            <p className="sx-alt">
              {t('otherVariants')}: {p.slotVariants}. {t('clarify')}{' '}
              <SourceLink href={p.slotsSrc} />
            </p>
          </Reveal>
          <Reveal className="sx-panel" delay={0.08}>
            <h2 className="sx-h">{h.museum.title}</h2>
            <Paras items={h.museum.paragraphs} />
            <Facts
              rows={[
                [t('days.sunThu'), p.museum.sunThu],
                [t('days.friSummer'), p.museum.friSummer],
                [t('days.friWinter'), p.museum.friWinter],
                [t('days.sat'), t('days.closed')],
              ]}
            />
            <p className="sx-alt">
              {t('otherVariants')}: {t('days.fri')} {p.museumFriAlt}. {t('clarify')}{' '}
              <SourceLink href={p.museumSrc} />
            </p>
          </Reveal>
          <Reveal className="sx-panel" delay={0.16}>
            <h2 className="sx-h">{h.kosher.title}</h2>
            <Paras items={h.kosher.paragraphs} />
            <Facts
              rows={[
                [t('days.sunThu'), p.kosher.sunThu],
                [t('days.fri'), p.kosher.fri],
                [t('days.sat'), t('days.closed')],
              ]}
            />
            <SourceLink href={p.kosherSrc} />
          </Reveal>
        </div>
      </Band>
      <Band tone="deep" pattern eyebrow={t('shabbatServices')}>
        <Facts
          rows={[
            [t('kabbalat'), p.shabbat.kabbalat],
            [t('shacharit'), p.shabbat.shacharit],
          ]}
        />
        <p className="sx-alt">
          <SourceLink href={p.shabbatSrc} />
        </p>
        <Button variant="light" href="/schedule" arrow>
          {t('toSchedule')}
        </Button>
      </Band>
    </SectionPage>
  );
};
