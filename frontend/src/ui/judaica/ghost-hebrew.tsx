/** shalom */
export const SHALOM = 'שלום';
/** baruchim haba'im - welcome */
export const BRUCHIM_HABAIM = 'ברוכים הבאים';

export interface GhostHebrewProps {
  /** Hebrew word(s), default shalom. */
  text?: string;
  /** Horizontal parallax by the inherited `--p`, in vw (default 12). */
  drift?: number;
  className?: string;
}

/** Huge Frank Ruhl Libre Hebrew word at opacity .04 behind content (parent: position:relative; overflow:clip). */
export const GhostHebrew = ({ text = SHALOM, drift = 12, className = '' }: GhostHebrewProps) => (
  <span
    className={`ghost-he ${className}`}
    lang="he"
    dir="rtl"
    aria-hidden
    style={{ ['--drift' as string]: `${drift}vw` }}
  >
    {text}
  </span>
);
