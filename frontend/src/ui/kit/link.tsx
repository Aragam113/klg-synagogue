import { type Href, router } from 'expo-router';
import { type MouseEvent, type ReactNode } from 'react';

import { assetUrl } from '@/config/demo';

export interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Opens in a new tab (auto for http(s) links). */
  external?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);

/** Real <a href> (SEO, middle click) with client-side navigation for internal paths. */
export const Link = ({
  href,
  children,
  className,
  external,
  onClick,
  ariaLabel,
  ariaCurrent,
}: LinkProps) => {
  const ext = external ?? /^https?:/.test(href);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (
      ext ||
      isExternal(href) ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey
    )
      return;
    e.preventDefault();
    router.push(href as Href);
  };
  return (
    <a
      href={assetUrl(href)}
      className={className}
      onClick={handle}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? 'page' : undefined}
      target={ext ? '_blank' : undefined}
      rel={ext ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
};
