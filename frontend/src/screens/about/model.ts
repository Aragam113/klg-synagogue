import { SITE, SRC } from '@/config/site';
import type { SectionsContent } from '@/content';

/** /about — об общине: руководство, раввин. Портреты публикуются только с проверенным источником. */
export interface AboutViewProps {
  content: SectionsContent['about'];
  introSrc: string;
}

export const aboutModel = (c: SectionsContent): AboutViewProps => ({
  content: {
    ...c.about,
    people: c.about.people.map((person) => ({
      ...person,
      ...(Object.values(SITE.people.rabbi.value).includes(person.name)
        ? {
            portrait: {
              url: '/media/people/david-shvedik.webp',
              source: 'https://feor.ru/administrative-units/kaliningrad/',
            },
          }
        : {}),
    })),
  },
  introSrc: SRC.gotov,
});
