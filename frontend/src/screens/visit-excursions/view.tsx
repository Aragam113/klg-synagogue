import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Button, Placeholder, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { num } from '../visit-shared/model';
import { Band, Facts, PageHero, PhoneFact, SectionPage, SourceLink } from '../visit-shared/ui';

import type { ExcursionsViewProps } from './model';

export const ExcursionsView = ({ content: e, prices, priceSrcs, phone }: ExcursionsViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="excursions">
      <PageHero
        hero={e.hero}
        photo="domeDarafsh"
        ghost={[GW.beitKnesset, GW.bruchim, GW.zachor, GW.yerushalayim, GW.kehila, GW.torah]}
      >
        <div className="btns">
          <Button variant="gold" href="/visit/excursions/book" arrow>
            {t('book')}
          </Button>
        </div>
      </PageHero>
      <Band tone="cream" eyebrow={t('kinds')}>
        <div className="sx-list">
          {e.kinds.map((k, i) => (
            <Reveal key={k.title} delay={i * 0.06} className="sx-list__item">
              <span className="sx-card__num">{num(i)}</span>
              <h2 className="sx-h">{k.title}</h2>
              <Text>{k.text}</Text>
            </Reveal>
          ))}
        </div>
      </Band>
      <Band tone="deep" pattern eyebrow={t('prices')}>
        <div className="sx-cols">
          <Reveal className="sx-panel">
            <Facts
              rows={[
                [
                  t('standard'),
                  <span key="s" className="sx-num">
                    {prices.standard}
                  </span>,
                ],
                [
                  t('reduced'),
                  <span key="r" className="sx-num">
                    {prices.reduced}
                  </span>,
                ],
                [t('coupon'), prices.coupon],
                [t('combo'), prices.combo],
                [t('walking'), prices.walking],
                [t('duration'), <Placeholder key="d">{t('ph.duration')}</Placeholder>],
              ]}
            />
            <p className="sx-alt">
              {priceSrcs.map((s, i) => (
                <span key={s}>
                  {i ? ' · ' : null}
                  <SourceLink href={s} />
                </span>
              ))}
            </p>
          </Reveal>
          <Reveal className="sx-panel" delay={0.08}>
            <h2 className="sx-h">{t('free')}</h2>
            <ul className="sx-ul">
              {e.free.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <h2 className="sx-h">{t('goodToKnow')}</h2>
            <ul className="sx-ul">
              {e.rules.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="sx-panel" delay={0.16}>
            <h2 className="sx-h">{t('excursionPhone')}</h2>
            <PhoneFact fact={phone} />
            <div className="btns">
              <Button variant="light" href="/visit/excursions/book" arrow>
                {t('book')}
              </Button>
            </div>
          </Reveal>
        </div>
      </Band>
    </SectionPage>
  );
};
