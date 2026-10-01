import { type Fact, SITE, SRC } from '@/config/site';
import type { SectionsContent } from '@/content';
import { formatRub } from '@/screens/events/content-model';

/** /visit/museum — музей «Новая синагога». */
export interface MuseumViewProps {
  content: SectionsContent['visit']['museum'];
  aboutSrc: string;
  hallsSrc: string;
  prices: { adult: string; reduced: string; combo: string };
  priceAlt: { adult: string; reduced: string; src: string };
  priceSrc: string;
  hours: { sunThu: string; friSummer: string; friWinter: string };
  hoursSrc: string;
  phone: Fact<string>;
  email: string;
  site: string;
}

export const museumModel = (c: SectionsContent, lang: string): MuseumViewProps => {
  const P = SITE.prices.museum;
  const rub = (n: number) => formatRub(n, lang);
  return {
    content: c.visit.museum,
    aboutSrc: SRC.jmCont,
    hallsSrc: SRC.jmInfo,
    prices: {
      adult: rub(P.value.adult),
      reduced: rub(P.value.reduced),
      combo: rub(SITE.prices.combo.value),
    },
    priceAlt: {
      adult: rub(P.alt[0].value.adult),
      reduced: rub(P.alt[0].value.reduced),
      src: P.alt[0].src,
    },
    priceSrc: P.src,
    hours: SITE.hours.museum.value,
    hoursSrc: SITE.hours.museum.src,
    phone: SITE.phones.museum,
    email: SITE.emails.museum.value,
    site: SITE.sites.museum.value,
  };
};
