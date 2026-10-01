import { MAPS, SITE, SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /visit/how-to-get — адрес, карта OSM, Яндекс/Google, транспорт. */
export interface HowToViewProps {
  content: SectionsContent['visit']['howTo'];
  address: string;
  addressSrc: string;
  maps: { yandex: string; google: string; osmEmbed: string; osm: string };
  transport: { stop: string; bus: string; tram: string; minibus: string };
  transportSrc: string;
  landmarksSrc: string;
  accessibilitySrc: string;
}

export const howToModel = (c: SectionsContent, lang: 'ru' | 'en' | 'he'): HowToViewProps => {
  const T = SITE.transport;
  return {
    content: c.visit.howTo,
    address: SITE.address.value[lang],
    addressSrc: SITE.address.src,
    maps: MAPS,
    transport: {
      stop: T.stop.value[lang],
      bus: T.bus.value.join(', '),
      tram: T.tram.value.join(', '),
      minibus: T.minibus.value.join(', '),
    },
    transportSrc: T.bus.src,
    landmarksSrc: SRC.oldRoute,
    accessibilitySrc: SRC.ym,
  };
};
