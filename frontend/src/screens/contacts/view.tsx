import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW } from '@/ui/judaica';
import { Button, Link, Placeholder, Text } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import { Band, PageHero, PhoneFact, SectionPage, SourceLink } from '../visit-shared/ui';

import type { ContactsViewProps } from './model';

export const ContactsView = ({
  content: k,
  address,
  addressSrc,
  groups,
  socials,
}: ContactsViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="contacts">
      <PageHero
        hero={k.hero}
        photo="nightLit"
        ghost={[GW.bruchim, GW.shalom, GW.kehila, GW.beitKnesset, GW.chesed]}
      >
        <p className="sx-addr">
          {address} <SourceLink href={addressSrc} />
        </p>
        <div className="btns">
          <Button variant="gold" href="/visit/how-to-get" arrow>
            {t('page.howTo')}
          </Button>
        </div>
      </PageHero>
      <Band tone="cream">
        <div className="sx-contacts">
          {groups.map((g, i) => (
            <Reveal key={g.key} delay={(i % 4) * 0.06} className="sx-panel">
              <h2 className="sx-h">{t(`groups.${g.key}`)}</h2>
              <PhoneFact fact={g.phone} />
              {g.email ? (
                <p>
                  <Link href={`mailto:${g.email.value}`}>{g.email.value}</Link>
                </p>
              ) : null}
            </Reveal>
          ))}
        </div>
        <Text>{k.note}</Text>
      </Band>
      <Band tone="deep" pattern eyebrow={t('social')}>
        <div className="sx-chips">
          {socials.map((s) =>
            s.url ? (
              <Link key={s.url} href={s.url} className="sx-chip">
                {s.label}
              </Link>
            ) : (
              <Placeholder key={s.kind}>{t('ph.telegram')}</Placeholder>
            )
          )}
        </div>
      </Band>
    </SectionPage>
  );
};
