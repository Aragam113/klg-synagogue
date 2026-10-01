import { type Fact, SITE, SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /community — хаб «Общине». */
export interface CommunityViewProps {
  content: SectionsContent['community'];
  /** Телефон к каждому блоку «приёма» по порядку: община, секретарь. */
  receptionPhones: Fact<string>[];
  shabbat: { kabbalat: string; shacharit: string };
  shabbatSrc: string;
  partnerSrcs: string[];
}

export const communityModel = (c: SectionsContent): CommunityViewProps => ({
  content: c.community,
  receptionPhones: [SITE.phones.community, SITE.phones.secretary],
  shabbat: SITE.hours.shabbat.value,
  shabbatSrc: SITE.hours.shabbat.src,
  partnerSrcs: [SRC.ofHome, SRC.feor],
});
