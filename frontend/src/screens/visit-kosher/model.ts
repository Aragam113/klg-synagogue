import { type Fact, SITE, SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /visit/kosher — кошерное питание. */
export interface KosherViewProps {
  content: SectionsContent['visit']['kosher'];
  aboutSrcs: string[];
  phone: Fact<string>;
  hours: { sunThu: string; fri: string };
  hoursSrc: string;
}

export const kosherModel = (c: SectionsContent): KosherViewProps => ({
  content: c.visit.kosher,
  aboutSrcs: [SRC.tlKosher, SRC.kgdFood],
  phone: SITE.phones.kosher,
  hours: SITE.hours.kosher.value,
  hoursSrc: SITE.hours.kosher.src,
});
