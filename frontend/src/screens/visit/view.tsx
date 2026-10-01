import { useLang } from '@/i18n/use-lang';
import { Button } from '@/ui/kit';

import { Band, CardGrid, Figure, PageHero, QuoteBlock, SectionPage } from '../visit-shared/ui';

import type { VisitViewProps } from './model';

export const VisitView = ({ content, gallery }: VisitViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="visit">
      <PageHero hero={content.hero} photo="nightRiver" ghost="ברוכים הבאים">
        <div className="btns">
          <Button variant="gold" href="/visit/excursions/book" arrow>
            {t('book')}
          </Button>
          <Button variant="ghost" href="/visit/how-to-get">
            {t('page.howTo')}
          </Button>
        </div>
      </PageHero>
      <Band tone="cream">
        <QuoteBlock quote={content.intro} />
        <CardGrid cards={content.cards} />
      </Band>
      <Band tone="ink" pattern>
        <div className="sx-gallery">
          {gallery.map((id) => (
            <Figure key={id} id={id} />
          ))}
        </div>
      </Band>
    </SectionPage>
  );
};
