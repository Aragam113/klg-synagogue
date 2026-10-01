import { type ReactNode } from 'react';

import { useLang } from '@/i18n/use-lang';
import type { ApiError } from '@/store/api/http';
import { MagenDavid } from '@/ui/judaica/magen-david';

import { Button } from './button';
import { Link } from './link';

export interface CardProps {
  href?: string;
  /** Image url for the top media. */
  media?: string;
  mediaAlt?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Rounded card (1.43rem), hover lift + image zoom; whole card is a link when `href` is set. */
export const Card = ({
  href,
  media,
  mediaAlt = '',
  eyebrow,
  title,
  children,
  footer,
  className = '',
}: CardProps) => {
  const inner = (
    <>
      {media ? (
        <div className="card__media">
          <img src={media} alt={mediaAlt} loading="lazy" />
        </div>
      ) : null}
      <div className="card__body">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {title ? <h3 className="card__title">{title}</h3> : null}
        {children}
        {footer ? <div className="card__footer">{footer}</div> : null}
      </div>
    </>
  );
  return href ? (
    <Link href={href} className={`card card--link ${className}`}>
      {inner}
    </Link>
  ) : (
    <div className={`card ${className}`}>{inner}</div>
  );
};

/** API/any error with optional retry. Renders nothing without an error. */
export const ErrorBox = ({
  error,
  onRetry,
  retryLabel,
}: {
  error?: ApiError | string | null;
  onRetry?: () => void;
  /** Текст кнопки повтора, если он не из языка сайта (админка — всегда ru). */
  retryLabel?: string;
}) => {
  const { t } = useLang();
  if (!error) return null;
  const text = typeof error === 'string' ? error : error.message;
  return (
    <div className="errorbox" role="alert">
      <p>{text}</p>
      {onRetry ? (
        <Button variant="ghost" onPress={onRetry}>
          {retryLabel ?? t('errors.retry')}
        </Button>
      ) : null}
    </div>
  );
};

/** Empty state with a quiet Star of David. */
export const Empty = ({
  title,
  text,
  children,
}: {
  title?: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
}) => {
  const { t } = useLang();
  return (
    <div className="empty">
      <MagenDavid size="2.5rem" strokeWidth={1} />
      <p className="empty__title">{title ?? t('empty.title')}</p>
      <p className="text">{text ?? t('empty.text')}</p>
      {children}
    </div>
  );
};

/**
 * Visible marker for a fact we do not have yet: renders "[ВПИШИ: ...]" on a striped plate (readable on all tones).
 * Never invent facts - use this instead.
 */
export const Placeholder = ({ children }: { children: ReactNode }) => (
  <mark className="ph" data-placeholder>
    [ВПИШИ: {children}]
  </mark>
);

/** "Доступно на русском" chip for API objects with `fallback: true`. */
export const FallbackBadge = ({ show }: { show?: boolean }) => {
  const { t } = useLang();
  return show ? <span className="badge">{t('fallback.ruOnly')}</span> : null;
};
