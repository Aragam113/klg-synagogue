import { useRef } from 'react';

import { useLang } from '@/i18n/use-lang';
import { GhostHebrew } from '@/ui/judaica/ghost-hebrew';
import { Container, Eyebrow, Link, Section, Text, Title } from '@/ui/kit';
import { Reveal, useScrollProgress } from '@/ui/motion';

import { num } from '../visit-shared/model';
import { Figure, PageHero, QuoteBlock, SectionPage } from '../visit-shared/ui';

import { chapterTone, type HistoryViewProps } from './model';

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

export const HistoryView = ({ content: h, toc }: HistoryViewProps) => {
  const { t } = useLang('sections');
  return (
    <SectionPage titleKey="history">
      <PageHero hero={h.hero} photo="k1900" ghost="זכור">
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
      {h.chapters.map((ch, i) => {
        const tone = chapterTone(i);
        const dark = tone !== 'cream';
        return (
          <Section
            key={ch.id}
            id={ch.id}
            tone={tone}
            pattern={dark ? 0.04 : undefined}
            className="sx-chapter"
          >
            {dark ? <GhostHebrew text="זכור" className="sx-chapter__ghost" /> : null}
            <Container
              className={`sx-chapter__grid ${ch.photos.length ? '' : 'sx-chapter__grid--solo'}`}
            >
              <div className="sx-chapter__text">
                <Reveal>
                  <span className="num num--outline sx-chapter__year">{ch.year}</span>
                </Reveal>
                <Reveal delay={0.06}>
                  <Eyebrow>{num(i)}</Eyebrow>
                  <Title text={ch.title} italicWord={ch.italic} stroke="reveal" />
                </Reveal>
                {ch.paragraphs.map((p, k) => (
                  <Reveal key={k} delay={0.1 + k * 0.05}>
                    <Text>{p}</Text>
                  </Reveal>
                ))}
                {ch.quote ? <QuoteBlock quote={ch.quote} /> : null}
              </div>
              {ch.photos.length ? (
                <div className="sx-chapter__media">
                  {ch.photos.map((id) => (
                    <Reveal key={id} variant="fade">
                      <Figure id={id} glow={dark} />
                    </Reveal>
                  ))}
                </div>
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
