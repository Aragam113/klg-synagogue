import { SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /visit/rules — правила посещения, Шаббат. */
export interface RulesViewProps {
  content: SectionsContent['visit']['rules'];
  shabbatSrc: string;
}

export const rulesModel = (c: SectionsContent): RulesViewProps => ({
  content: c.visit.rules,
  shabbatSrc: SRC.ofTour,
});
