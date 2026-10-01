/**
 * Общие блоки страниц статических разделов: шапка-обложка, фото с атрибуцией, цитата, карточки-ссылки,
 * факт с источником и вариантами. Стили — `sections.css` (web).
 */
import { type ReactNode } from 'react';

import { type Fact, telHref } from '@/config/site';
import { getContent, PHOTOS } from '@/content';
import type { Hero, LinkCard, Quote } from '@/content/types';
import { useLang } from '@/i18n/use-lang';
import { ArchFrame } from '@/ui/judaica/arch-frame';
import { GhostHebrew } from '@/ui/judaica/ghost-hebrew';
import { Arrow, Container, Eyebrow, Link, Page, Section, Text, Title, type Tone } from '@/ui/kit';
import { Reveal } from '@/ui/motion';

import './styles';

export const useSections = () => {
  const l = useLang('sections');
  return { ...l, c: getContent(l.lang) };
};

/** Страница раздела: <title> «Страница — Новая синагога Калининграда». */
export const SectionPage = ({ titleKey, children }: { titleKey: string; children: ReactNode }) => {
  const { t } = useLang('sections');
  return (
    <Page title={`${t(`page.${titleKey}`)}`} className="sx">
      {children}
    </Page>
  );
};

/** Обложка раздела: тёмная секция с гексаграммами, призрачным ивритом и фото в арке (параллакс от --p). */
export const PageHero = ({
  hero,
  photo,
  ghost = 'שלום',
  children,
}: {
  hero: Hero;
  photo?: string;
  ghost?: string;
  children?: ReactNode;
}) => (
  <Section tone="deep" pattern={0.05} className="sx-hero" ariaLabel={hero.title}>
    <GhostHebrew text={ghost} className="sx-hero__ghost" />
    <Container className={`sx-hero__grid ${photo ? '' : 'sx-hero__grid--solo'}`}>
      <div className="sx-hero__text">
        <Reveal>
          <Eyebrow className="sx-eyebrow-line">{hero.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <Title as="h1" size="hero" text={hero.title} italicWord={hero.italic} stroke="reveal" />
        </Reveal>
        <Reveal delay={0.16}>
          <Text lead>{hero.lead}</Text>
        </Reveal>
        {children ? <Reveal delay={0.24}>{children}</Reveal> : null}
      </div>
      {photo ? (
        <div className="sx-hero__media">
          <Figure id={photo} glow />
        </div>
      ) : null}
    </Container>
  </Section>
);

/** Фото из `PHOTOS` в арке с подписью: что на фото · автор, лицензия, Wikimedia Commons. */
export const Figure = ({ id, glow, ratio }: { id: string; glow?: boolean; ratio?: string }) => {
  const { t, lang } = useLang('sections');
  const p = PHOTOS[id];
  if (!p) return null;
  return (
    <figure className="sx-figure">
      <div className="sx-figure__frame">
        <ArchFrame src={p.src} alt={p.alt[lang]} glow={glow} ratio={ratio} />
      </div>
      <figcaption className="sx-figure__cap">
        <span>{p.alt[lang]}</span>{' '}
        <Link href={p.page} className="sx-credit">
          {t('photo')}: {p.author === 'unknown' ? '—' : p.author}, {p.license}, Wikimedia Commons
        </Link>
      </figcaption>
    </figure>
  );
};

export const QuoteBlock = ({ quote }: { quote: Quote }) => (
  <Reveal as="figure" className="sx-quote" variant="blur">
    <blockquote>«{quote.text}»</blockquote>
    <figcaption>
      — {quote.author},{' '}
      <Link href={quote.href} className="sx-credit">
        {quote.source}
      </Link>
    </figcaption>
  </Reveal>
);

/** Сетка карточек-ссылок с номерами 01, 02… (как в эталоне). */
export const CardGrid = ({ cards }: { cards: LinkCard[] }) => (
  <div className="sx-cards">
    {cards.map((c, i) => (
      <Reveal key={c.href + c.title} delay={(i % 3) * 0.08} className="sx-cards__item">
        <Link href={c.href} className="sx-card">
          <span className="sx-card__num">{String(i + 1).padStart(2, '0')}</span>
          <span className="sx-card__title">{c.title}</span>
          <span className="sx-card__text">{c.text}</span>
          <span className="sx-card__go">
            <Arrow />
          </span>
        </Link>
      </Reveal>
    ))}
  </div>
);

export const SourceLink = ({ href }: { href: string }) => {
  const { t } = useLang('sections');
  return (
    <Link href={href} className="sx-src">
      {t('source')}
    </Link>
  );
};

/** Телефон из `site.ts` + другие опубликованные номера с пометкой «уточняйте». */
export const PhoneFact = ({ fact }: { fact: Fact<string> }) => {
  const { t } = useLang('sections');
  return (
    <span className="sx-phone">
      <Link href={telHref(fact.value)}>{fact.value}</Link> <SourceLink href={fact.src} />
      {fact.alt?.length ? (
        <span className="sx-alt">
          {t('otherVariants')}:{' '}
          {fact.alt.map((a) => (
            <span key={a.value}>
              <Link href={telHref(a.value)}>{a.value}</Link> <SourceLink href={a.src} />{' '}
            </span>
          ))}
          {t('clarify')}
        </span>
      ) : null}
    </span>
  );
};

/** Строки «подпись — значение». */
export const Facts = ({ rows }: { rows: [ReactNode, ReactNode][] }) => (
  <dl className="sx-facts">
    {rows.map(([k, v], i) => (
      <div key={i} className="sx-facts__row">
        <dt>{k}</dt>
        <dd>{v}</dd>
      </div>
    ))}
  </dl>
);

/** Обычная секция с заголовком (eyebrow + title) и Reveal. */
export const Band = ({
  tone = 'cream',
  eyebrow,
  title,
  italic,
  children,
  id,
  pattern,
}: {
  tone?: Tone;
  eyebrow?: string;
  title?: string;
  italic?: string;
  children: ReactNode;
  id?: string;
  pattern?: boolean | number;
}) => (
  <Section tone={tone} id={id} pattern={pattern} className="sx-band">
    <Container>
      {eyebrow ? (
        <Reveal>
          <Eyebrow className="sx-eyebrow-line">{eyebrow}</Eyebrow>
        </Reveal>
      ) : null}
      {title ? (
        <Reveal delay={0.06}>
          <Title text={title} italicWord={italic} stroke={italic ? 'reveal' : undefined} />
        </Reveal>
      ) : null}
      {children}
    </Container>
  </Section>
);

export const Paras = ({ items }: { items: string[] }) => (
  <>
    {items.map((p, i) => (
      <Reveal key={i} delay={i * 0.06}>
        <Text>{p}</Text>
      </Reveal>
    ))}
  </>
);
