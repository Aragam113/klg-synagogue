import { type ReactNode, useRef, useState } from 'react';

import { useMotionOn, useScrollProgress } from './hooks';

export interface PinnedProps {
  /** One node per chapter; each takes a screen of scroll and enters/leaves by `--p`. */
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
 * Wherever motion is on (`html[data-motion='on']`), touch included: on a phone the runway and the sticky viewport use
 * the fixed px height (`--vh-fix`), `--p` follows the polled scrollY by lerp and the page is pulled to a chapter stop
 * once it rests (`snap`, touch only — the same as the scroll scene). Reduced motion: the chapters in a static column.
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
  const motion = useMotionOn();
  useScrollProgress(ref, {
    mode: 'pin',
    snap: motion && n > 1 ? n : undefined,
    onChange: (p) => {
      if (motion) setActive(Math.min(n - 1, Math.floor(p * n)));
    },
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
