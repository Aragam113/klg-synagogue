import { Fragment } from 'react';

import { Link } from '@/ui/kit';

import { glueEmoji, paragraphs, shortUrl, splitLinks } from './content-model';

/** Текст с ссылками: http(s)-адреса становятся внешними ссылками с коротким видом адреса. */
export const Linked = ({ text }: { text: string }) => (
  <>
    {splitLinks(text).map((part, i) =>
      part.href ? (
        <Link key={i} href={part.href} className="cnt-url">
          {shortUrl(part.text)}
        </Link>
      ) : (
        <Fragment key={i}>{part.text}</Fragment>
      )
    )}
  </>
);

/** Тело новости/события: абзацы через пустую строку, ссылки кликабельны, эмодзи не отрываются от слов. */
export const RichText = ({
  text,
  className,
}: {
  text: string | null | undefined;
  className?: string;
}) => (
  <div className={className ? `cnt-body ${className}` : 'cnt-body'}>
    {paragraphs(text).map((p, i) => (
      <p key={i} className="text">
        <Linked text={glueEmoji(p)} />
      </p>
    ))}
  </div>
);
