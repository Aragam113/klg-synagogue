import { useEffect, useRef, useState } from 'react';

import type { NewsItem } from '@/store/api/content';
import { Reveal } from '@/ui/motion';

import { NewsCard } from './cards';
import { railActive } from './rail-model';
import './news-rail.css';

export interface NewsRailProps {
  items: NewsItem[];
  /** Desktop grid classes of the track (`grid grid--3`, `cnt-grid`): above 767px the block is exactly that grid. */
  className: string;
  /** Reveal stagger per card, seconds. */
  step?: number;
  testId?: string;
}

/**
 * News previews (home, «more news»): the desktop grid as is; on a phone (≤ 767px, `news-rail.css`) — a horizontal
 * rail with native scroll + scroll-snap, ~84% cards with the next one peeking, 16px side fields, RTL in he,
 * and position dots. Vertical gestures stay with the page (touch engine, Lenis `data-lenis-prevent-horizontal`).
 */
export const NewsRail = ({ items, className, step = 0.08, testId }: NewsRailProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof requestAnimationFrame === 'undefined') return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const cards = Array.from(el.children, (c) => {
        const b = c.getBoundingClientRect();
        return { start: b.left, end: b.right };
      });
      setActive(railActive({ start: r.left, end: r.right }, cards));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items.length]);

  return (
    <div className="news-rail" data-news-rail>
      <div
        ref={ref}
        className={`news-rail__track ${className}`}
        data-testid={testId}
        data-lenis-prevent-horizontal
      >
        {items.map((n, i) => (
          <Reveal key={n.id} delay={i * step} className="news-rail__item">
            <NewsCard item={n} />
          </Reveal>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="news-rail__dots" aria-hidden data-active={active}>
          {items.map((n, i) => (
            <span
              key={n.id}
              className="news-rail__dot"
              data-on={i === active ? 'true' : undefined}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
