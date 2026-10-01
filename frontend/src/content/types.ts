/**
 * Статические тексты разделов: «Общине», «Туристам», история, об общине, контакты, правовые страницы.
 * Один и тот же тип на ru/en/he; факты (телефоны, часы, цены) — не здесь, а в `src/config/site.ts`.
 * Каждый абзац с фактом о синагоге/общине — только с источником: комментарий `src:` рядом.
 */
export interface Hero {
  eyebrow: string;
  title: string;
  /** Слово из title, выделяемое золотым курсивом с рукописной линией. */
  italic: string;
  lead: string;
}

export interface Block {
  title: string;
  paragraphs: string[];
}

export interface LinkCard {
  title: string;
  text: string;
  href: string;
}

export interface Quote {
  text: string;
  author: string;
  /** Название источника (ссылка — `href`). */
  source: string;
  href: string;
}

export interface Chapter {
  id: string;
  year: string;
  title: string;
  italic: string;
  paragraphs: string[];
  /** Ключи из `PHOTOS`. */
  photos: string[];
  quote?: Quote;
}

export interface Person {
  name: string;
  role: string;
  note: string;
  href: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  sections: Block[];
}

export interface SectionsContent {
  community: {
    hero: Hero;
    intro: Quote;
    cards: LinkCard[];
    programs: { title: string; when: string; text: string; href: string }[];
    reception: Block[];
    partners: Block;
  };
  visit: {
    hero: Hero;
    intro: Quote;
    cards: LinkCard[];
    hours: { hero: Hero; synagogue: Block; museum: Block; kosher: Block };
    howTo: {
      hero: Hero;
      landmarks: Block;
      accessibility: Block;
      nearby: { title: string; text: string }[];
    };
    rules: { hero: Hero; items: { title: string; text: string }[]; shabbat: Block };
    excursions: {
      hero: Hero;
      kinds: { title: string; text: string }[];
      rules: string[];
      free: string[];
    };
    museum: {
      hero: Hero;
      about: Block;
      halls: { title: string; text: string }[];
      exhibitions: Block;
    };
    kosher: { hero: Hero; about: Block; groups: Block };
  };
  history: {
    hero: Hero;
    chapters: Chapter[];
    timeline: { date: string; text: string }[];
  };
  about: {
    hero: Hero;
    intro: Block;
    people: Person[];
    trust: Block;
  };
  contacts: { hero: Hero; note: string };
  legal: { privacy: LegalDoc; consent: LegalDoc };
}
