import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Button, Link, Placeholder, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { num } from '../visit-shared/model';
import { Band, Facts, Figure, PageHero, Paras, SectionPage, SourceLink } from '../visit-shared/ui';

import type { HowToViewProps } from './model';

export const HowToView = (p: HowToViewProps) => {
  const { t } = useLang('sections');
  const h = p.content;
  return (
    <SectionPage titleKey="howTo">
      <PageHero
        hero={h.hero}
        photo="fishVillage"
        ghost={[GW.shalom, GW.bruchim, GW.beitKnesset, GW.yerushalayim, GW.kehila]}
      >
        <p className="sx-addr">
          {p.address} <SourceLink href={p.addressSrc} />
        </p>
      </PageHero>
      <Band tone="cream">
        <div className="sx-map">
          <iframe
            title={t('mapTitle')}
            src={p.maps.osmEmbed}
            loading="lazy"
            className="sx-map__frame"
          />
          <div className="btns sx-map__btns">
            <Button variant="primary" href={p.maps.yandex} arrow>
              {t('yandex')}
            </Button>
            <Button variant="ghost" href={p.maps.google} arrow>
              {t('google')}
            </Button>
            <Link href={p.maps.osm} className="sx-src">
              {t('osm')}
            </Link>
          </div>
        </div>
        <div className="sx-cols">
          <Reveal className="sx-panel">
            <h2 className="sx-h">{t('transport')}</h2>
            <Facts
              rows={[
                [t('stop'), p.transport.stop],
                [t('bus'), p.transport.bus],
                [t('tram'), p.transport.tram],
                [t('minibus'), p.transport.minibus],
                [t('parking'), <Placeholder key="p">{t('ph.parking')}</Placeholder>],
              ]}
            />
            <SourceLink href={p.transportSrc} />
          </Reveal>
          <Reveal className="sx-panel" delay={0.08}>
            <h2 className="sx-h">{h.landmarks.title}</h2>
            <Paras items={h.landmarks.paragraphs} />
            <SourceLink href={p.landmarksSrc} />
          </Reveal>
          <Reveal className="sx-panel" delay={0.16}>
            <h2 className="sx-h">{h.accessibility.title}</h2>
            <Paras items={h.accessibility.paragraphs} />
            <SourceLink href={p.accessibilitySrc} />
          </Reveal>
        </div>
      </Band>
      <Band tone="deep" pattern eyebrow={t('nearby')}>
        <div className="sx-list">
          {h.nearby.map((n, i) => (
            <Reveal key={n.title} delay={i * 0.06} className="sx-list__item">
              <span className="sx-card__num">{num(i)}</span>
              <h3 className="sx-h">{n.title}</h3>
              <Text>{n.text}</Text>
            </Reveal>
          ))}
        </div>
        <div className="sx-gallery">
          <Figure id="orphanage2025" />
          <Figure id="nightLit" />
        </div>
      </Band>
    </SectionPage>
  );
};
