import { type ReactNode } from 'react';

import { Link } from './link';

export interface ButtonProps {
  children: ReactNode;
  /** primary: ink pill (light on dark tones) | ghost: outline | gold: bronze pill | light: canvas pill. */
  variant?: 'primary' | 'ghost' | 'gold' | 'light';
  size?: 'md' | 'lg';
  href?: string;
  onPress?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  /** Sending: disabled + aria-busy + a spinner before the label. */
  busy?: boolean;
  /** Trailing arrow (mirrored in RTL). */
  arrow?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Arrow = () => (
  <svg
    className="arrow"
    width="1em"
    height="1em"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden
  >
    <path d="M2 8h11M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Pill button with the reference glint on hover; press/hold/ripple come from the kit press system; renders <a> when `href` is set. */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onPress,
  type = 'button',
  disabled: disabledProp,
  busy,
  arrow,
  className = '',
  ariaLabel,
}: ButtonProps) => {
  const disabled = disabledProp || busy;
  const cls = `btn btn--${variant} btn--${size} ${className}`;
  const body = (
    <>
      {busy ? <span className="btn__spin" aria-hidden /> : null}
      <span>{children}</span>
      {arrow ? <Arrow /> : null}
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} onClick={onPress} ariaLabel={ariaLabel}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      onClick={onPress}
      disabled={disabled}
      aria-busy={busy || undefined}
      aria-label={ariaLabel}
    >
      {body}
    </button>
  );
};
