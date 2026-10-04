import { Fragment, useRef, type PointerEvent as RPointerEvent } from 'react';

import { PHOTO_TALL, PHOTOS } from '@/content';
import { SynagogueScrub } from '@/scenes/synagogue-scrub';
import { EventCard, FundraiserCard, NewsCard } from '@/screens/events/cards';
import { countdownText } from '@/screens/schedule/model';
import type { EventItem, Fundraiser, NewsItem } from '@/store/api/content';
import {
  ArchFrame,
  BRUCHIM_HABAIM,
  GHOST_WORDS as GW,
  GhostField,
  HexPattern,
  MagenDavid,
  Rosette,
  SHALOM,
} from '@/ui/judaica';
import { Button, Container, Eyebrow, Link, Section, Text, Title } from '@/ui/kit';
import { SubscribeForm } from '@/ui/layout/slots/subscribe-form';
import { HandStroke, Marquee, Pinned, Reveal } from '@/ui/motion';

import {
  COMMUNITY,
  LEDGER,
  VISIT,
  type BlockState,
  type SceneChapter,
  type TodayBlock,
} from './model';
import './styles';

type T = (key: string, opts?: Record<string, unknown>) => string;

export interface HomeViewProps {
  t: T;
  lang: string;
  chapters: SceneChapter[];
  today: { state: BlockState; block: TodayBlock | null };
  events: { state: BlockState; items: EventItem[] };
  funds: { state: BlockState; items: Fundraiser[]; supporters: number | null };
  /** `<Marquee>` items of the dedications ribbon (`dedicationItems` from donate-model). */
  dedications: { text: string; italic?: boolean }[];
  news: { state: BlockState; items: NewsItem[] };
}

/** «Созвездие» words of the home sections: the first one is the big anchor. */
const HERO_GHOSTS = [GW.shalom, GW.kehila, GW.torah, GW.shabbat, GW.beitKnesset, GW.yerushalayim];
const WELCOME_GHOSTS = [GW.bruchim, GW.chesed, GW.tzedaka, GW.emuna, GW.kehila, GW.shalom];

/** Marquee words: greetings in the three languages of the site. */
const MARQUEE = [
  { text: 'Шалом' },
  { text: 'Shalom', italic: true },
  { text: SHALOM },
  { text: 'Шаббат шалом', italic: true },
  { text: 'Shabbat shalom' },
  { text: 'שבת שלום', italic: true },
  { text: 'Добро пожаловать' },
  { text: BRUCHIM_HABAIM, italic: true },
];

const Head = ({ t, ns, light = false }: { t: T; ns: string; light?: boolean }) => (
  <div className={`home-head ${light ? 'home-head--light' : ''}`}>
    <Eyebrow>{t(`${ns}.eyebrow`)}</Eyebrow>
    <Title size="xl" text={t(`${ns}.title`)} italicWord={t(`${ns}.italic`)} stroke="reveal" />
  </div>
);

const Skeleton = ({ n = 3 }: { n?: number }) => (
  <div className="home-skeleton" aria-busy>
    {Array.from({ length: n }, (_, i) => (
      <span key={i} />
    ))}
  </div>
);

/** H1 whose words rise out of a mask one by one (`hero-word-rise`), the accent word gets a hand stroke. */
const HeroTitle = ({ text, italic }: { text: string; italic: string }) => (
  <h1 className="title title--hero home-hero__title">
    {text.split(' ').map((w, i) => (
      <Fragment key={i}>
        {/* the space sits between the masks: a trailing space inside an inline-block is dropped */}
        <span className="home-word" style={{ ['--w' as string]: i }}>
          <span className="home-word__in">
            {w === italic ? (
              <em className="em-stroke">
                {w}
                <HandStroke trigger="reveal" delay={1.1} />
              </em>
            ) : (
              w
            )}
          </span>
        </span>{' '}
      </Fragment>
    ))}
  </h1>
);

/** Horizontal slider with arrows and mouse drag (touch scrolls natively, with snap). */
const Slider = ({ children, t }: { children: React.ReactNode; t: T }) => {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const step = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollBy({ left: dir * rtl * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft };
    track.current.dataset.dragging = 'true';
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !track.current) return;
    track.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };
  const up = () => {
    drag.current = null;
    if (track.current) delete track.current.dataset.dragging;
  };
  return (
    <div className="home-slider">
      <div
        ref={track}
        className="home-slider__track"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        data-home="events-track"
      >
        {children}
      </div>
      <div className="home-slider__nav">
        <button
          type="button"
          className="home-arrow"
          onClick={() => step(-1)}
          aria-label={t('events.prev')}
        >
          ←
        </button>
        <button
          type="button"
          className="home-arrow"
          onClick={() => step(1)}
          aria-label={t('events.next')}
        >
          →
        </button>
      </div>
    </div>
  );
};

/** The home page: 12 sections top to bottom; every section «lives» in its own way. */
export const HomeView = ({
  t,
  lang,
  chapters,
  today,
  events,
  funds,
  dedications,
  news,
}: HomeViewProps) => {
  const units = {
    d: t('calendar:widget.d'),
    h: t('calendar:widget.h'),
    m: t('calendar:widget.m'),
    s: t('calendar:widget.s'),
  };
  const tb = today.block;
  return (
    <div className="home" data-home="root">
      {/* 2. Hero */}
      <Section tone="cream" className="home-hero" id="hero">
        <GhostField seed="home-hero" words={HERO_GHOSTS} />
        <HexPattern opacity={0.04} parallax={-8} />
        <Container>
          <div className="home-hero__inner">
            <div className="home-hero__eyebrow">
              <MagenDavid size="1.4rem" strokeWidth={1.2} />
              <Eyebrow>{t('hero.eyebrow')}</Eyebrow>
            </div>
            <HeroTitle text={t('hero.title')} italic={t('hero.italic')} />
            <p className="home-hero__lead">{t('hero.lead')}</p>
            <div className="home-hero__actions">
              <Button href="/visit" arrow>
                {t('hero.visit')}
              </Button>
              <Button href="/donate" variant="ghost">
                {t('hero.donate')}
              </Button>
            </div>
          </div>
        </Container>
        <div className="home-cue" aria-hidden>
          <span>{t('hero.cue')}</span>
          <i />
        </div>
      </Section>

      <SynagogueScrub
        chapters={chapters}
        creditsLabel={t('scene.credits')}
        credit={t('scene.credit')}
        ariaLabel={t('scene.aria')}
      />

      {/* 3. Threshold */}
      <Section tone="deep" curtain pattern={0.05} className="home-threshold" id="welcome">
        <GhostField seed="home-welcome" words={WELCOME_GHOSTS} tone="dark" />
        <Container size="narrow" className="home-center">
          <Eyebrow>{t('threshold.eyebrow')}</Eyebrow>
          <Title
            size="hero"
            text={t('threshold.title')}
            italicWord={t('threshold.italic')}
            stroke="progress"
          />
          <p className="home-threshold__he" lang="he" dir="rtl">
            {BRUCHIM_HABAIM}
          </p>
          <div className="home-line" aria-hidden />
          <Text lead className="home-threshold__note">
            {t('threshold.note')}
          </Text>
        </Container>
      </Section>

      {/* 4. Today */}
      <Section tone="deeper" className="home-today" id="today">
        <Container>
          <Head t={t} ns="today" light />
          {today.state === 'loading' ? (
            <Skeleton n={4} />
          ) : tb ? (
            <div className="home-today__grid" data-home="today">
              <Reveal className="home-tile">
                <span className="home-tile__k">{tb.gregorian}</span>
                <span className="home-tile__v home-tile__v--he">{tb.hebrew}</span>
                <span className="home-tile__k">{t('today.hebrew')}</span>
              </Reveal>
              <Reveal className="home-tile" delay={0.08}>
                <span className="home-tile__k">{t('today.clock')}</span>
                <span className="home-tile__v home-clock" data-home="clock">
                  {tb.clock}
                </span>
              </Reveal>
              <Reveal className="home-tile" delay={0.16}>
                <span className="home-tile__k">{t('today.candles')}</span>
                {tb.candles && tb.left ? (
                  <>
                    <span className="home-tile__v">{tb.candles.time}</span>
                    <span className="home-tile__k" data-home="countdown">
                      {t('today.in')} {countdownText(tb.left, units)}
                    </span>
                  </>
                ) : (
                  <span className="home-tile__k">{t('today.passed')}</span>
                )}
              </Reveal>
              <Reveal className="home-tile" delay={0.24}>
                <span className="home-tile__k">{t('today.parasha')}</span>
                <span className="home-tile__v">{tb.parasha ?? t('today.holidayReading')}</span>
              </Reveal>
            </div>
          ) : (
            <Text className="home-note">{t('today.unavailable')}</Text>
          )}
          <div className="home-actions">
            <Button href="/schedule" variant="light" arrow>
              {t('today.all')}
            </Button>
          </div>
        </Container>
      </Section>

      {/* 5. Community life — pinned chapters. Phone (≤ 767px, touch): enters as a big arch that opens into a
          full-screen photo with the chapter over it; the extra nodes below are hidden elsewhere (home.css). */}
      <Section tone="deeper" flush pattern={0.03} className="home-community" id="community">
        <Container>
          <Pinned
            header={
              <>
                <Head t={t} ns="community" light />
                <span className="home-life__segments" aria-hidden>
                  {COMMUNITY.map((c, i) => (
                    <span key={c.id} style={{ ['--i' as string]: i }} />
                  ))}
                </span>
              </>
            }
            chapters={COMMUNITY.map((c, i) => {
              const p = PHOTOS[c.photo];
              return (
                <div key={c.id} className="home-chapter">
                  <img
                    className="home-chapter__photo"
                    src={PHOTO_TALL[c.photo] ?? p?.src}
                    alt=""
                    loading="lazy"
                  />
                  <span className="num num--outline home-chapter__n">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Title size="md" as="h3" text={t(`community.${c.id}.title`)} />
                  <Text className="home-chapter__text">{t(`community.${c.id}.text`)}</Text>
                  <Button href={c.href} variant="light" arrow>
                    {t('community.more')}
                  </Button>
                </div>
              );
            })}
            renderAside={(active) => {
              const p = PHOTOS[COMMUNITY[active].photo];
              return (
                <>
                  <ArchFrame
                    src={p?.src}
                    alt={p?.alt[lang as 'ru'] ?? ''}
                    ratio="3 / 4"
                    glow
                    className="home-arch"
                  />
                  <div className="home-life__frame">
                    <div className="home-life__photos">
                      {COMMUNITY.map((c, i) => (
                        <img
                          key={c.id}
                          className="home-life__photo"
                          src={PHOTO_TALL[c.photo] ?? PHOTOS[c.photo]?.src}
                          alt={i === active ? (PHOTOS[c.photo]?.alt[lang as 'ru'] ?? '') : ''}
                          loading="lazy"
                          data-current={i === active}
                          style={{ ['--i' as string]: i }}
                        />
                      ))}
                    </div>
                    <span className="home-life__shade" aria-hidden />
                  </div>
                </>
              );
            }}
          />
        </Container>
      </Section>

      {/* 6. Ledger */}
      <Section tone="deeper" pattern={0.04} className="home-ledger" id="ledger">
        <Container>
          <Head t={t} ns="ledger" light />
          <Reveal className="home-ledger__row" variant="fade">
            {LEDGER.map((f, i) => (
              <div key={f.id} className="home-ledger__cell" style={{ ['--i' as string]: i }}>
                <span className="home-ledger__v">
                  {f.value}
                  {f.unit ? <small> {t(`ledger.${f.unit}`)}</small> : null}
                </span>
                <span className="home-ledger__k">{t(`ledger.${f.id}`)}</span>
              </div>
            ))}
          </Reveal>
        </Container>
      </Section>

      {/* 7. Marquee */}
      <Section tone="deeper" flush className="home-marquee">
        <Marquee
          items={MARQUEE}
          separator={<MagenDavid size="1em" strokeWidth={1.5} />}
          duration={36}
        />
      </Section>

      {/* 8. For visitors */}
      <Section tone="cream" className="home-visit" id="visit">
        <Container>
          <Head t={t} ns="visit" />
          <div className="grid grid--4 home-visit__grid">
            {VISIT.map((v, i) => (
              <Reveal key={v.id} delay={i * 0.08}>
                <Link className="home-vcard" href={v.href}>
                  <span className="home-vcard__media">
                    <img src={PHOTOS[v.photo]?.src} alt="" loading="lazy" />
                  </span>
                  <span className="home-vcard__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="home-vcard__t">{t(`visit.${v.id}.title`)}</span>
                  <span className="home-vcard__x">{t(`visit.${v.id}.text`)}</span>
                  <span className="link-arrow">{t('community.more')}</span>
                </Link>
              </Reveal>
            ))}
          </div>
          <div className="home-actions">
            <Button href="/visit" variant="ghost" arrow>
              {t('visit.all')}
            </Button>
          </div>
        </Container>
      </Section>

      {/* 9. Events slider */}
      <Section tone="ink" grain className="home-events" id="events">
        <Container>
          <Head t={t} ns="events" light />
          {events.state === 'loading' ? (
            <Skeleton />
          ) : events.state === 'ready' ? (
            <Slider t={t}>
              {events.items.map((e, i) => (
                <Reveal key={e.id} delay={i * 0.08} className="home-slide">
                  <EventCard event={e} />
                </Reveal>
              ))}
            </Slider>
          ) : (
            <div className="home-empty" data-home="events-empty">
              <Title size="md" as="h3" text={t('events.empty')} />
              <Text>{t('events.emptyNote')}</Text>
              <div className="home-empty__form">
                <SubscribeForm />
              </div>
            </div>
          )}
          <div className="home-actions">
            <Button href="/events" variant="light" arrow>
              {t('events.all')}
            </Button>
          </div>
        </Container>
      </Section>

      {/* 10. Fundraisers */}
      <Section
        tone="cream"
        className={`home-funds${funds.state === 'ready' || funds.state === 'loading' ? '' : ' home-funds--quiet'}`}
        id="funds"
      >
        <Container>
          <Head t={t} ns="funds" />
          {funds.supporters ? (
            <p className="home-supporters" data-home="supporters">
              <MagenDavid size="1.2rem" strokeWidth={1.2} />{' '}
              {t('funds.supporters', { count: funds.supporters })}
            </p>
          ) : null}
          {funds.state === 'loading' ? (
            <Skeleton />
          ) : funds.state === 'ready' ? (
            <div className="grid grid--3">
              {funds.items.slice(0, 3).map((f, i) => (
                <Reveal key={f.id} delay={i * 0.08}>
                  <FundraiserCard fundraiser={f} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Text className="home-note">{funds.state === 'empty' ? t('funds.empty') : ''}</Text>
          )}
          {dedications.length ? (
            <div className="home-dedications" data-home="dedications">
              <Eyebrow>{t('funds.dedications')}</Eyebrow>
              <Marquee items={dedications} duration={48} />
            </div>
          ) : null}
          <div className="home-actions">
            <Button href="/donate" arrow>
              {t('funds.donate')}
            </Button>
          </div>
        </Container>
      </Section>

      {/* 11. News */}
      <Section tone="cream" className="home-news" id="news">
        <Container>
          <Head t={t} ns="news" />
          {news.state === 'loading' ? (
            <Skeleton />
          ) : news.state === 'ready' ? (
            <div className="grid grid--3">
              {news.items.slice(0, 3).map((n, i) => (
                <Reveal key={n.id} delay={i * 0.08}>
                  <NewsCard item={n} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Text className="home-note">{t('news.empty')}</Text>
          )}
          <div className="home-actions">
            <Button href="/news" variant="ghost" arrow>
              {t('news.all')}
            </Button>
          </div>
        </Container>
      </Section>

      {/* 12. Dawn */}
      <Section tone="canvas" className="home-dawn" id="dawn">
        <div className="home-dawn__rosette" aria-hidden>
          {/* The wrapper turns slowly by itself (every device), the rosette inside adds the scroll turn */}
          <span className="home-dawn__spin">
            <Rosette size="min(64.286rem, 140vw)" spin={45} />
          </span>
        </div>
        <Container size="text" className="home-center">
          <Eyebrow>{t('dawn.eyebrow')}</Eyebrow>
          <Title
            size="hero"
            text={t('dawn.title')}
            italicWord={t('dawn.italic')}
            stroke="progress"
          />
          <Text lead className="home-dawn__note">
            {t('dawn.note')}
          </Text>
          <Button href="/donate" size="lg" arrow>
            {t('dawn.button')}
          </Button>
        </Container>
      </Section>
    </div>
  );
};
