import type { CSSProperties } from 'react';

import { type GhostAnchor, type GhostDensity, ghostLayout, type GhostTitleAt } from './ghost-model';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export interface GhostFieldProps {
  /** Pattern key: different seeds → different but stable patterns (use the page/section id). */
  seed: string;
  /** Hebrew words; the first one is the big anchor. Default — the common set (`DEFAULT_GHOST_WORDS`). */
  words?: readonly string[];
  /** Words on desktop and on phones (default 6 / 3). */
  density?: Partial<GhostDensity>;
  /** Background of the section: `dark` → light words with the same low opacity. Default — the section's `--fg`. */
  tone?: 'light' | 'dark';
  /** Where the title sits: satellites keep out of it (default `center`). */
  titleAt?: GhostTitleAt;
  /** Big anchor word: `free` side opposite the title (default) or `center` backdrop. */
  anchor?: GhostAnchor;
}

/**
 * «Созвездие»: background Hebrew words behind a section (direct child of `<Section>`). Absolute layer
 * under the content (z-index 0), clipped by itself; every word drifts with the scroll by its own vector
 * plus a slow idle float — only transform/opacity, static under reduced motion.
 */
export const GhostField = ({
  seed,
  words,
  density,
  tone,
  titleAt = 'center',
  anchor,
}: GhostFieldProps) => {
  const layout = ghostLayout({ seed, words, density, titleAt, anchor });
  return (
    <div className={`gf${tone ? ` gf--${tone}` : ''}`} aria-hidden data-ghost={seed}>
      {layout.map((w, i) => (
        <span
          key={i}
          className={`gf-pos${w.desk ? ' gf-desk' : ''}${i === 0 ? ' gf-anchor' : ''}`}
          style={
            {
              '--x': `${w.x}%`,
              '--y': `${w.y}%`,
              '--s': w.size,
              '--o': w.o,
              '--dx': `${w.dx}vw`,
              '--dy': `${w.dy}rem`,
              '--i': i,
            } as Vars
          }
        >
          <span className="gf-w" lang="he" dir="rtl">
            {w.text}
          </span>
        </span>
      ))}
    </div>
  );
};
