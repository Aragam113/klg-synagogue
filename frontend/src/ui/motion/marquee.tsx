import { type ReactNode } from 'react';

export interface MarqueeItem {
  text: ReactNode;
  /** Gold italic accent item. */
  italic?: boolean;
}

export interface MarqueeProps {
  items: MarqueeItem[];
  /** Separator between items; default Star of David U+2721. */
  separator?: ReactNode;
  /** Loop duration in seconds (default 36). */
  duration?: number;
  className?: string;
}

/** Endless ticker: duplicated track translate 0 -> -50%, linear, fading edges. Stopped when motion is off. */
export const Marquee = ({
  items,
  separator = '✡',
  duration = 36,
  className = '',
}: MarqueeProps) => {
  const group = (hidden: boolean) => (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <span key={i} className="marquee__pair">
          <span className={`marquee__item${it.italic ? ' marquee__item--it' : ''}`}>{it.text}</span>
          <span className="marquee__sep" aria-hidden>
            {separator}
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${className}`} style={{ ['--dur' as string]: `${duration}s` }}>
      <div className="marquee__track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
};
