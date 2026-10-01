import { SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /about — об общине: руководство, раввин. Портреты — только силуэт-заглушка. */
export interface AboutViewProps {
  content: SectionsContent['about'];
  introSrc: string;
}

export const aboutModel = (c: SectionsContent): AboutViewProps => ({
  content: c.about,
  introSrc: SRC.gotov,
});
