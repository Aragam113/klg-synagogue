import { useRef } from 'react';

import { useLang } from '@/i18n/use-lang';
import { GHOST_WORDS as GW, GhostField } from '@/ui/judaica';
import { Container, Eyebrow, Link, Section, Text, Title } from '@/ui/kit';
import { Reveal, useScrollProgress } from '@/ui/motion';

import { num } from '../visit-shared/model';
import { Figure, PageHero, QuoteBlock, SectionPage } from '../visit-shared/ui';

import { chapterTone, type HistoryViewProps } from './model';

/** «Созвездие» истории: «помни» — якорь обложки и тёмных глав. */
const HERO_GHOSTS = [GW.zachor, GW.beitKnesset, GW.kehila, GW.yerushalayim, GW.torah, GW.emuna];
const CHAPTER_GHOSTS = [GW.zachor, GW.kehila, GW.emuna, GW.yerushalayim];

/** Таймлайн: линия рисуется от `--p` (useScrollProgress ставит переменную на <ol>). */
const Timeline = ({ items }: { items: { date: string; text: string }[] }) => {
  const ref = useRef<HTMLOListElement>(null);
  useScrollProgress(ref);
  return (
    <ol ref={ref} className="sx-timeline">
      {items.map((it, i) => (
        <Reveal as="li" key={it.date} delay={(i % 4) * 0.05} className="sx-timeline__item">
          <span className="sx-timeline__date">{it.date}</span>
          <span className="sx-timeline__text">{it.text}</span>
        </Reveal>
      ))}
    </ol>
  );
};

export const HistoryView = ({ content: h, chapters, toc }: HistoryViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="history">
      <PageHero hero={h.hero} photo="k1900" ghost={HERO_GHOSTS}>
        <nav className="sx-toc" aria-label={t('toc')}>
          <p className="eyebrow">{t('toc')}</p>
          <ol>
            {toc.map((it) => (
              <li key={it.href}>
                <Link href={it.href}>
                  {it.year ? <span className="sx-toc__year">{it.year}</span> : null} {it.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>
      {chapters.map((ch, i) => {
        const tone = chapterTone(i);
        const dark = tone !== 'cream';
        const { layout } = ch;
        // Цитата уходит в боковую колонку там, где фото рядом нет (quote) или они лентой ниже (strip).
        const asideQuote = ch.quote && (layout === 'quote' || layout === 'strip') ? ch.quote : null;
        const grid = [
          'sx-chapter__grid',
          `sx-chapter__grid--${asideQuote || layout !== 'strip' ? layout : 'solo'}`,
          ch.flip ? 'sx-chapter__grid--flip' : '',
        ].join(' ');
        return (
          <Section
            key={ch.id}
            id={ch.id}
            tone={tone}
            pattern={dark ? 0.04 : undefined}
            className="sx-chapter"
          >
            {dark ? (
              <GhostField
                seed={`history-${ch.id}`}
                words={CHAPTER_GHOSTS}
                tone="dark"
                titleAt={ch.flip ? 'end' : 'start'}
                density={{ desk: 4, phone: 1 }}
              />
            ) : null}
            <Container className={grid}>
              <div className="sx-chapter__text">
                <Reveal>
                  <span className="num num--outline sx-chapter__year">{ch.year}</span>
                </Reveal>
                <Reveal delay={0.06}>
                  <Eyebrow>{num(i)}</Eyebrow>
                  <Title text={ch.title} italicWord={ch.italic} stroke="reveal" />
                </Reveal>
                <div className="sx-chapter__paras">
                  {ch.paragraphs.map((p, k) => (
                    <Reveal key={k} delay={0.1 + k * 0.05}>
                      <Text>{p}</Text>
                    </Reveal>
                  ))}
                </div>
                {ch.quote && !asideQuote ? <QuoteBlock quote={ch.quote} /> : null}
              </div>
              {asideQuote ? (
                <div className="sx-chapter__aside">
                  <QuoteBlock quote={asideQuote} />
                </div>
              ) : null}
              {layout === 'fill' ? (
                <Reveal variant="fade" className="sx-chapter__media sx-chapter__media--fill">
                  <Figure id={ch.photos[0]} glow={dark} ratio="auto" className="sx-figure--wide" />
                </Reveal>
              ) : null}
              {layout === 'pair' ? (
                <div className="sx-chapter__media sx-chapter__media--pair">
                  {ch.photos.map((id, k) => (
                    <Reveal key={id} variant="fade" delay={k * 0.08}>
                      <Figure id={id} glow={dark} />
                    </Reveal>
                  ))}
                </div>
              ) : null}
              {layout === 'strip' ? (
                // Одна Reveal на ленту: на телефоне кадры за краем горизонтальной ленты IO не видит.
                <Reveal variant="fade" className="sx-chapter__strip">
                  {ch.photos.map((id) => (
                    <div key={id} className="sx-chapter__shot">
                      <Figure id={id} glow={dark} ratio="4 / 3" className="sx-figure--wide" />
                    </div>
                  ))}
                </Reveal>
              ) : null}
            </Container>
          </Section>
        );
      })}
      <Section tone="deeper" pattern={0.05} id="timeline" className="sx-band">
        <Container>
          <Reveal>
            <Eyebrow className="sx-eyebrow-line">{t('timeline')}</Eyebrow>
          </Reveal>
          <Timeline items={h.timeline} />
        </Container>
      </Section>
    </SectionPage>
  );
};
