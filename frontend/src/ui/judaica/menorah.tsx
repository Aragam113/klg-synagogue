export interface MenorahProps {
  size?: number | string;
  strokeWidth?: number;
  /** Flames flicker softly (only when motion is on). */
  lit?: boolean;
  className?: string;
}

const LAMPS = [40, 60, 80, 100, 120, 140, 160];

/** Linear seven-branched menorah, stroke = currentColor. */
export const Menorah = ({
  size = '6rem',
  strokeWidth = 1.6,
  lit = true,
  className = '',
}: MenorahProps) => (
  <svg
    className={`menorah ${lit ? 'menorah--lit' : ''} ${className}`}
    style={{ width: size, height: 'auto' }}
    viewBox="0 0 200 170"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M80 50 A20 20 0 0 0 120 50 M60 50 A40 40 0 0 0 140 50 M40 50 A60 60 0 0 0 160 50 M100 50 V150" />
    <path d="M72 150 Q100 140 128 150 M62 160 H138" />
    {LAMPS.map((x) => (
      <g key={x}>
        <path d={`M${x - 6} 50 H${x + 6}`} />
        <path
          className="menorah__flame"
          style={{ transformOrigin: `${x}px 46px`, animationDelay: `${(x % 3) * 0.37}s` }}
          d={`M${x} 46 C ${x + 4.5} 41, ${x + 2.5} 35, ${x} 31 C ${x - 2.5} 35, ${x - 4.5} 41, ${x} 46 Z`}
        />
      </g>
    ))}
  </svg>
);
