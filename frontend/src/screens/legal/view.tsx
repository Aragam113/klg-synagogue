import { Container, Placeholder, Section, Title } from '@/ui/kit';

import { SectionPage } from '../visit-shared/ui';

import { type LegalViewProps, splitPlaceholders } from './model';

const WithPlaceholders = ({ text }: { text: string }) => (
  <>
    {splitPlaceholders(text).map((part, i) =>
      part.ph ? <Placeholder key={i}>{part.text}</Placeholder> : part.text
    )}
  </>
);

export const LegalView = ({ kind, doc }: LegalViewProps) => (
  <SectionPage titleKey={kind}>
    <Section tone="cream" className="sx-legal">
      <Container size="text">
        <Title as="h1" size="lg" text={doc.title} />
        <p className="eyebrow">{doc.updated}</p>
        {doc.sections.map((s) => (
          <section key={s.title}>
            <h2 className="sx-h">{s.title}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="text">
                <WithPlaceholders text={p} />
              </p>
            ))}
          </section>
        ))}
      </Container>
    </Section>
  </SectionPage>
);
