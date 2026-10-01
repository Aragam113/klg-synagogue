import { Fragment } from 'react';

import { Link } from '@/ui/kit';

import { paragraphs, splitLinks } from './content-model';

/** Текст с ссылками: http(s)-адреса становятся внешними ссылками. */
export const Linked = ({ text }: { text: string }) => (
  <>
    {splitLinks(text).map((part, i) =>
      part.href ? (
        <Link key={i} href={part.href}>
          {part.text}
        </Link>
      ) : (
        <Fragment key={i}>{part.text}</Fragment>
      )
    )}
  </>
);

/** Тело новости/события: абзацы через пустую строку, ссылки кликабельны. */
export const RichText = ({ text }: { text: string | null | undefined }) => (
  <div className="cnt-body">
    {paragraphs(text).map((p, i) => (
      <p key={i} className="text">
        <Linked text={p} />
      </p>
    ))}
  </div>
);
