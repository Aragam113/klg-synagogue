import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Link, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { num } from '../visit-shared/model';
import {
  Band,
  Facts,
  Figure,
  PageHero,
  Paras,
  PhoneFact,
  SectionPage,
  SourceLink,
} from '../visit-shared/ui';

import type { MuseumViewProps } from './model';

export const MuseumView = (p: MuseumViewProps) => {
  const { t } = useLang('sections');
  const m = p.content;
  return (
    <SectionPage titleKey="museum">
      <PageHero
        hero={m.hero}
        photo="k1925"
        ghost={[GW.zachor, GW.beitKnesset, GW.kehila, GW.yerushalayim, GW.emuna, GW.torah]}
      />
      <Band tone="cream" title={m.about.title}>
        <Paras items={m.about.paragraphs} />
        <SourceLink href={p.aboutSrc} />
      </Band>
      <Band tone="deep" pattern eyebrow={t('halls')}>
        <div className="sx-list">
          {m.halls.map((h, i) => (
            <Reveal key={h.title} delay={i * 0.06} className="sx-list__item">
              <span className="sx-card__num">{num(i)}</span>
              <h2 className="sx-h">{h.title}</h2>
              <Text>{h.text}</Text>
            </Reveal>
          ))}
        </div>
        <p className="sx-alt">
          <SourceLink href={p.hallsSrc} />
        </p>
      </Band>
      <Band tone="cream">
        <div className="sx-cols">
          <Reveal className="sx-panel">
            <h2 className="sx-h">{t('tickets')}</h2>
            <Facts
              rows={[
                [
                  t('museumAdult'),
                  <span key="a" className="sx-num">
                    {p.prices.adult}
                  </span>,
                ],
                [
                  t('museumReduced'),
                  <span key="r" className="sx-num">
                    {p.prices.reduced}
                  </span>,
                ],
                [t('combo'), p.prices.combo],
              ]}
            />
            <p className="sx-alt">
              {t('otherVariants')}: {p.priceAlt.adult} / {p.priceAlt.reduced}{' '}
              <SourceLink href={p.priceAlt.src} />. {t('clarify')} <SourceLink href={p.priceSrc} />
            </p>
          </Reveal>
          <Reveal className="sx-panel" delay={0.08}>
            <h2 className="sx-h">{t('page.hours')}</h2>
            <Facts
              rows={[
                [t('days.sunThu'), p.hours.sunThu],
                [t('days.friSummer'), p.hours.friSummer],
                [t('days.friWinter'), p.hours.friWinter],
                [t('days.sat'), t('days.closed')],
              ]}
            />
            <SourceLink href={p.hoursSrc} />
          </Reveal>
          <Reveal className="sx-panel" delay={0.16}>
            <h2 className="sx-h">{t('groups.museum')}</h2>
            <PhoneFact fact={p.phone} />
            <p>
              <Link href={`mailto:${p.email}`}>{p.email}</Link>
            </p>
            <p>
              <Link href={p.site}>{t('museumSite')}</Link>
            </p>
          </Reveal>
        </div>
      </Band>
      <Band tone="ink" pattern title={m.exhibitions.title}>
        <Paras items={m.exhibitions.paragraphs} />
        <div className="sx-gallery">
          <Figure id="interior1896" />
          <Figure id="k1900" />
        </div>
      </Band>
    </SectionPage>
  );
};
