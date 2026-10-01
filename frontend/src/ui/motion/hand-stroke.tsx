import { useRef } from 'react';

import { useReveal } from './hooks';

export interface HandStrokeProps {
  /** SVG path in a 300x24 box; default is a hand-drawn underline. */
  d?: string;
  /** 'reveal' (default): draws once on reveal. 'progress': drawn by the inherited `--p` between from..to. */
  trigger?: 'reveal' | 'progress';
  from?: number;
  to?: number;
  strokeWidth?: number;
  /** 'under' (default) underline, 'strike' through the middle. */
  placement?: 'under' | 'strike';
  /** Seconds (reveal mode). */
  delay?: number;
  className?: string;
}

export const STROKE_UNDERLINE = 'M2 17 C 80 9, 210 21, 298 8';
export const STROKE_STRIKE = 'M0 14 C 90 7, 210 17, 300 4';

/** Hand-drawn SVG stroke via stroke-dashoffset. Put inside a `position:relative` inline element; color = currentColor (gold by default). */
export const HandStroke = ({
  d,
  trigger = 'reveal',
  from = 0.55,
  to = 0.78,
  strokeWidth = 3.5,
  placement = 'under',
  delay = 0.2,
  className = '',
}: HandStrokeProps) => {
  const ref = useRef<SVGSVGElement>(null);
  useReveal(ref);
  const path = d ?? (placement === 'strike' ? STROKE_STRIKE : STROKE_UNDERLINE);
  return (
    <svg
      ref={ref}
      className={`stroke stroke--${trigger} stroke--${placement} ${className}`}
      viewBox="0 0 300 24"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        ['--from' as string]: from,
        ['--k' as string]: 1 / Math.max(0.001, to - from),
        ['--delay' as string]: `${delay}s`,
      }}
    >
      <path d={path} pathLength={1} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
