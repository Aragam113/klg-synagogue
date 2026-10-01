/** Hexagram lattice tile 120x120: a Star of David in the centre and quarter stars in the corners. */
const HEX = (x: number, y: number) =>
  `<polygon points='${x},${y - 30} ${x + 25.98},${y + 15} ${x - 25.98},${y + 15}'/>` +
  `<polygon points='${x},${y + 30} ${x + 25.98},${y - 15} ${x - 25.98},${y - 15}'/>`;
const TILE =
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120' fill='none' stroke='black' stroke-width='1'>" +
  HEX(60, 60) +
  HEX(0, 0) +
  HEX(120, 0) +
  HEX(0, 120) +
  HEX(120, 120) +
  '</svg>';
export const HEX_TILE_URL = `url("data:image/svg+xml,${encodeURIComponent(TILE)}")`;

export interface HexPatternProps {
  /** .03-.05 per reference (default .04). */
  opacity?: number;
  /** Parallax by the section's `--p`, percent of own height (default -12). 0 = static. */
  parallax?: number;
  className?: string;
}

/** Barely visible hexagram lattice over the whole parent section (parent: position:relative). Colour = section text colour. */
export const HexPattern = ({ opacity = 0.04, parallax = -12, className = '' }: HexPatternProps) => (
  <span
    className={`hexpattern ${className}`}
    aria-hidden
    style={{
      ['--o' as string]: opacity,
      ['--par' as string]: `${parallax}%`,
      ['--tile-img' as string]: HEX_TILE_URL,
    }}
  />
);
