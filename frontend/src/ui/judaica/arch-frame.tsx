import { type ReactNode } from 'react';

export interface ArchFrameProps {
  src?: string;
  alt?: string;
  /** Custom media instead of an <img>. */
  children?: ReactNode;
  /** Bronze glow behind the arch (default true). */
  glow?: boolean;
  /** CSS aspect-ratio (default '3 / 4'). */
  ratio?: string;
  className?: string;
}

/** Arched window like synagogue windows: round top, 7px bottom corners; the photo has scroll parallax from `--p`. */
export const ArchFrame = ({
  src,
  alt = '',
  children,
  glow = true,
  ratio = '3 / 4',
  className = '',
}: ArchFrameProps) => (
  <div className={`arch-wrap ${glow ? 'arch-wrap--glow' : ''} ${className}`}>
    <div className="arch" style={{ aspectRatio: ratio }}>
      {children ?? (src ? <img src={src} alt={alt} loading="lazy" /> : null)}
    </div>
  </div>
);
