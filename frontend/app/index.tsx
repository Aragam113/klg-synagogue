import { useLang } from '@/i18n/use-lang';
import { BRUCHIM_HABAIM, GhostHebrew, MagenDavid } from '@/ui/judaica';
import { Container, Eyebrow, Page, Section, Text, Title } from '@/ui/kit';

/** Placeholder home. Task 08 owns this route and replaces the file. */
export default function Home() {
  const { t } = useLang();
  return (
    <Page title={t('site.name')}>
      <Section tone="cream" className="home-ph">
        <GhostHebrew text={BRUCHIM_HABAIM} />
        <Container size="narrow">
          <MagenDavid size="3rem" strokeWidth={1} className="home-ph__mark" />
          <Eyebrow>{t('home.eyebrow')}</Eyebrow>
          <Title
            as="h1"
            size="hero"
            text={t('home.title')}
            italicWord={t('home.italic')}
            stroke="reveal"
          />
          <Text lead>{t('home.lead')}</Text>
        </Container>
      </Section>
    </Page>
  );
}
