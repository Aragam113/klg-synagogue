import { SITE } from '@/config/site';
import type { SectionsContent } from '@/content';

import { slotRange } from '../visit-shared/model';

/** /visit/hours — часы синагоги, музея, столовой; Шаббат. */
export interface HoursViewProps {
  content: SectionsContent['visit']['hours'];
  slots: readonly string[];
  /** Расходящиеся варианты сеансов «11:00–17:00 / 13:00–16:00». */
  slotVariants: string;
  slotsSrc: string;
  museum: { sunThu: string; friSummer: string; friWinter: string };
  museumFriAlt: string;
  museumSrc: string;
  kosher: { sunThu: string; fri: string };
  kosherSrc: string;
  shabbat: { kabbalat: string; shacharit: string };
  shabbatSrc: string;
}

export const hoursModel = (c: SectionsContent): HoursViewProps => {
  const H = SITE.hours;
  return {
    content: c.visit.hours,
    slots: H.excursionSlots.value,
    slotVariants: H.excursionSlots.alt.map((a) => slotRange(a.value)).join(' / '),
    slotsSrc: H.excursionSlots.src,
    museum: H.museum.value,
    museumFriAlt: H.museum.alt[0].value.friSummer,
    museumSrc: H.museum.src,
    kosher: H.kosher.value,
    kosherSrc: H.kosher.src,
    shabbat: H.shabbat.value,
    shabbatSrc: H.shabbat.src,
  };
};
