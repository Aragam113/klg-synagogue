export interface RosetteProps {
  /** CSS size (default '64.286rem' as in the reference). */
  size?: number | string;
  /** Rotation in degrees at --p = 1 (default 30, hexagram symmetry is 60). 0 = static. */
  spin?: number;
  className?: string;
}

/** Rosette: one Star of David inscribed in circles + 3 rays through its vertices. Rotates by the inherited `--p`. */
export const Rosette = ({ size = '64.286rem', spin = 30, className = '' }: RosetteProps) => (
  <svg
    className={`rosette ${spin ? 'rosette--spin' : ''} ${className}`}
    style={{ width: size, height: size, ['--spin' as string]: `${spin}deg` }}
    viewBox="0 0 200 200"
    fill="none"
    stroke="currentColor"
    strokeWidth={0.6}
    aria-hidden
  >
    <circle cx="100" cy="100" r="90" />
    <circle cx="100" cy="100" r="64" />
    <circle cx="100" cy="100" r="42" />
    <circle cx="100" cy="100" r="8" />
    <polygon points="100,36 155.43,132 44.57,132" />
    <polygon points="100,164 155.43,68 44.57,68" />
    <path d="M100 10 V190 M177.94 55 L22.06 145 M22.06 55 L177.94 145" />
  </svg>
);
