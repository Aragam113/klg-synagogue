export interface MagenDavidProps {
  /** CSS size (default '1.5em'). */
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  /** Accessible name; decorative (aria-hidden) when omitted. */
  title?: string;
}

/** Linear Star of David (two interlaced equilateral triangles), stroke = currentColor. */
export const MagenDavid = ({
  size = '1.5em',
  strokeWidth = 1.4,
  className = '',
  title,
}: MagenDavidProps) => (
  <svg
    className={`magen ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinejoin="round"
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
  >
    <polygon points="12,1.5 21.09,17.25 2.91,17.25" />
    <polygon points="12,22.5 21.09,6.75 2.91,6.75" />
  </svg>
);
