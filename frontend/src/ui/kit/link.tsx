import { type Href, router } from 'expo-router';
import { type MouseEvent, type ReactNode } from 'react';

import { routeHref, stripBase } from '@/config/demo';

export interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Opens in a new tab (auto for http(s) links). */
  external?: boolean;
  /** Runs first; `e.preventDefault()` cancels the navigation. */
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  testID?: string;
  ariaLabel?: string;
  ariaCurrent?: boolean;
}

const isExternal = (href: string) => /^(https?:|mailto:|tel:)/.test(href);

/**
 * The site's only way to render a link: real <a href> (SEO, middle click, base URL via `routeHref`)
 * with client-side navigation for internal paths. Raw `<a href>` is banned by lint outside the kit.
 */
export const Link = ({
  href,
  children,
  className,
  external,
  onClick,
  ariaLabel,
  ariaCurrent,
  testID,
}: LinkProps) => {
  const ext = external ?? /^https?:/.test(href);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
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
    router.push(stripBase(href) as Href);
  };
  return (
    <a
      href={routeHref(href)}
      className={className}
      onClick={handle}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? 'page' : undefined}
      data-testid={testID}
      target={ext ? '_blank' : undefined}
      rel={ext ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
};
