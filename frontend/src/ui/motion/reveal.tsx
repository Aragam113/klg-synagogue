import { type CSSProperties, type ElementType, type ReactNode, useRef } from 'react';

import { useReveal } from './hooks';

export interface RevealProps {
  children: ReactNode;
  /** 'up' (default) slides 1.286rem up, 'fade' only fades, 'blur' fades in from a blur. */
  variant?: 'up' | 'fade' | 'blur';
  /** Seconds; use i * 0.08 for staggered lists. */
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

/** Appears once when scrolled into view (IO threshold .2, -8% bottom margin). Static and visible when motion is off. */
export const Reveal = ({
  children,
  variant = 'up',
  delay = 0,
  as: Tag = 'div',
  className = '',
  style,
}: RevealProps) => {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${variant} ${className}`}
      style={{ ...style, ['--delay' as string]: `${delay}s` }}
    >
      {children}
    </Tag>
  );
};
