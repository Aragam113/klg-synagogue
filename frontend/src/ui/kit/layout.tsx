import Head from 'expo-router/head';
import { type ReactNode, useRef } from 'react';

import { useLang } from '@/i18n/use-lang';
import { HexPattern } from '@/ui/judaica/hex-pattern';
import { useScrollProgress } from '@/ui/motion/hooks';

import { pageTitle } from './page-title';

export type Tone = 'cream' | 'canvas' | 'deep' | 'deeper' | 'ink';

/** Page wrapper: sets <title> as "<title> — <full site name>" (common:site.full); no title → just the site name. */
export const Page = ({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => {
  const { t } = useLang();
  return (
    <div className={`page ${className}`}>
      <Head>
        <title>{pageTitle(title, t('common:site.full'))}</title>
      </Head>
      {children}
    </div>
  );
};

export interface SectionProps {
  /** Background tone: cream (beige) | canvas (light beige) | deep (blue-green) | deeper | ink (almost black). */
  tone?: Tone;
  children: ReactNode;
  id?: string;
  /** Hexagram lattice background; number = opacity (default .04). */
  pattern?: boolean | number;
  /** Rounded top + upward shadow, overlaps the previous section ("curtain"). */
  curtain?: boolean;
  /** Film grain overlay (for ink sections). */
  grain?: boolean;
  /** Removes default paddings. */
  flush?: boolean;
  /** Registers the section in the scroll engine so children can use `--p` (default true). */
  progress?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Page band with a tone; sets --bg/--fg/--fg-mute/--line for children and `--p` for scroll choreography. */
export const Section = ({
  tone = 'cream',
  children,
  id,
  pattern,
  curtain,
  grain,
  flush,
  progress = true,
  className = '',
  ariaLabel,
}: SectionProps) => {
  const ref = useRef<HTMLElement>(null);
  const none = useRef<HTMLElement>(null);
  useScrollProgress(progress ? ref : none);
  const cls = [
    'sec',
    `tone-${tone}`,
    curtain && 'sec--curtain',
    grain && 'sec--grain',
    flush && 'sec--flush',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <section ref={ref} id={id} className={cls} aria-label={ariaLabel}>
      {pattern ? <HexPattern opacity={typeof pattern === 'number' ? pattern : 0.04} /> : null}
      {children}
    </section>
  );
};

/** Centered column: wide = 1260px@1440, narrow = 787px, text = 682px. */
export const Container = ({
  children,
  size = 'wide',
  className = '',
}: {
  children: ReactNode;
  size?: 'wide' | 'narrow' | 'text';
  className?: string;
}) => <div className={`container container--${size} ${className}`}>{children}</div>;
