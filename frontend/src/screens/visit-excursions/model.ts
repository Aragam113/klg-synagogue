import { type Fact, SITE } from '@/config/site';
import type { SectionsContent } from '@/content';
import { formatRub } from '@/screens/events/content-model';

/** /visit/excursions — виды, цены, правила, запись. */
export interface ExcursionsViewProps {
  content: SectionsContent['visit']['excursions'];
  prices: { standard: string; reduced: string; coupon: string; combo: string; walking: string };
  priceSrcs: string[];
  phone: Fact<string>;
}

export const excursionsModel = (c: SectionsContent, lang: string): ExcursionsViewProps => {
  const P = SITE.prices;
  const rub = (n: number) => formatRub(n, lang);
  return {
    content: c.visit.excursions,
    prices: {
      standard: rub(P.excursion.value.standard),
      reduced: rub(P.excursion.value.reduced),
      coupon: `−${P.excursion.value.couponPercent}%`,
      combo: rub(P.combo.value),
      walking: rub(P.walkingTour.value),
    },
    priceSrcs: [P.excursion.src, P.combo.src],
    phone: SITE.phones.excursions,
  };
};
