import { type ReactNode, useRef, useState } from 'react';

import { useScrollProgress } from './hooks';

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
 * On touch / reduced motion it becomes a normal flow of stacked chapters.
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
  useScrollProgress(ref, {
    mode: 'pin',
    onChange: (p) => setActive(Math.min(n - 1, Math.floor(p * n))),
  });
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
          <div className="pinned__stage">
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
        </div>
      </div>
    </div>
  );
};
