import type { SectionsContent } from '@/content';

/** /visit — хаб «Туристам». */
export interface VisitViewProps {
  content: Pick<SectionsContent['visit'], 'hero' | 'intro' | 'cards'>;
  /** Ключи PHOTOS для галереи внизу. */
  gallery: string[];
}

export const visitModel = (c: SectionsContent): VisitViewProps => ({
  content: { hero: c.visit.hero, intro: c.visit.intro, cards: c.visit.cards },
  gallery: ['fromWater', 'fishVillage', 'winter2025'],
});
