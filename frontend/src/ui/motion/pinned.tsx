import { type ReactNode, useRef, useState } from 'react';

import { usePinOn, useScrollProgress } from './hooks';

export interface PinnedProps {
  /** One node per chapter; each takes 100svh of scroll and enters/leaves by `--p`. */
  chapters: ReactNode[];
  /** Static content above the chapters inside the sticky viewport (eyebrow, title). */
  header?: ReactNode;
  /** Side media that depends on the active chapter (e.g. a photo in ArchFrame). */
  renderAside?: (active: number) => ReactNode;
  /** Shows the "01 / 04" drum counter (default true). */
  counter?: boolean;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Pinned chapters as in the reference: height 100svh x (chapters + 1), sticky 100svh viewport, per-chapter
 * `--i` and `--local/--in/--out` CSS math, gold progress line scaleX(var(--p)), drum counter.
 * On touch / reduced motion it becomes a horizontal scroll-snap ribbon (`data-ribbon`) with dots under the aside
 * (reference 390_scroll_03); the active chapter then follows the ribbon, not the page scroll.
 */
export const Pinned = ({
  chapters,
  header,
  renderAside,
  counter = true,
  className = '',
}: PinnedProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const n = chapters.length;
  const [active, setActive] = useState(0);
  const motion = usePinOn();
  const ribbon = useRef<HTMLDivElement>(null);
  useScrollProgress(ref, {
    mode: 'pin',
    onChange: (p) => {
      if (motion) setActive(Math.min(n - 1, Math.floor(p * n)));
    },
  });
  const onRibbon = () => {
    const el = ribbon.current;
    if (!el || !el.clientWidth) return;
    setActive(Math.max(0, Math.min(n - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth))));
  };
  const goTo = (i: number) => {
    const el = ribbon.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollTo({ left: rtl * i * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div
      ref={ref}
      className={`pinned ${className}`}
      data-active={active}
      style={{ ['--chapters' as string]: n }}
    >
      <div className="pinned__sticky">
        <div className="pinned__progress" aria-hidden />
        {(header || counter) && (
          <div className="pinned__head">
            <div>{header}</div>
            {counter && (
              <div className="pinned__counter" aria-hidden>
                <span className="drum">
                  <span
                    className="drum__reel"
                    style={{ transform: `translateY(${-1.2 * active}em)` }}
                  >
                    {chapters.map((_, i) => (
                      <span key={i}>{pad(i + 1)}</span>
                    ))}
                  </span>
                </span>
                <span className="pinned__total">/ {pad(n)}</span>
              </div>
            )}
          </div>
        )}
        <div className="pinned__body">
          <div
            className="pinned__stage"
            ref={ribbon}
            data-ribbon={motion ? undefined : ''}
            onScroll={motion ? undefined : onRibbon}
          >
            {chapters.map((c, i) => (
              <div
                key={i}
                className="pinned__chapter"
                data-current={i === active}
                style={{ ['--i' as string]: i }}
              >
                {c}
              </div>
            ))}
          </div>
          {renderAside && <div className="pinned__aside">{renderAside(active)}</div>}
          {!motion && n > 1 ? (
            <div className="pinned__dots">
              {chapters.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className="pinned__dot"
                  aria-label={`${pad(i + 1)} / ${pad(n)}`}
                  aria-current={i === active}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
