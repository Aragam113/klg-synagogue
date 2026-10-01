import { type ReactNode } from 'react';

import { HandStroke } from '@/ui/motion/hand-stroke';

/** Caps caption with tracking, 50-60% colour. */
export const Eyebrow = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => <p className={`eyebrow ${className}`}>{children}</p>;

export interface TitleProps {
  /** Plain text of the title; `italicWord` inside it becomes the gold italic accent. */
  text?: string;
  italicWord?: string;
  /** Hand-drawn gold underline under the italic word ('reveal' or by section `--p`). */
  stroke?: 'reveal' | 'progress';
  /** Alternative to `text`: custom content (use <em> for the accent yourself). */
  children?: ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** hero 63px | xl 84px | lg 38px | md 28px | sm 21px (@1440). */
  size?: 'hero' | 'xl' | 'lg' | 'md' | 'sm';
  className?: string;
}

/** Playfair Display title (Frank Ruhl Libre on Hebrew) with one accent word in gold italic. */
export const Title = ({
  text,
  italicWord,
  stroke,
  children,
  as: Tag = 'h2',
  size = 'lg',
  className = '',
}: TitleProps) => {
  let content: ReactNode = children;
  if (text !== undefined) {
    const i = italicWord ? text.lastIndexOf(italicWord) : -1;
    content =
      i < 0 || !italicWord ? (
        text
      ) : (
        <>
          {text.slice(0, i)}
          <em className={stroke ? 'em-stroke' : undefined}>
            {italicWord}
            {stroke ? <HandStroke trigger={stroke} /> : null}
          </em>
          {text.slice(i + italicWord.length)}
        </>
      );
  }
  return <Tag className={`title title--${size} ${className}`}>{content}</Tag>;
};

/** Body text with muted colour; `lead` for subtitles. */
export const Text = ({
  children,
  lead,
  className = '',
}: {
  children: ReactNode;
  lead?: boolean;
  className?: string;
}) => <p className={`${lead ? 'lead' : 'text'} ${className}`}>{children}</p>;
