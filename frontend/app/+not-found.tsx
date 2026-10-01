import { useLang } from '@/i18n/use-lang';
import { MagenDavid } from '@/ui/judaica';
import { Button, Container, Page, Section, Text, Title } from '@/ui/kit';

export default function NotFound() {
  const { t } = useLang();
  return (
    <Page title={t('notFound.title')}>
      <Section tone="cream">
        <Container size="narrow">
          <MagenDavid size="3rem" strokeWidth={1} className="home-ph__mark" />
          <Title as="h1" size="xl" text={t('notFound.title')} />
          <Text lead>{t('notFound.text')}</Text>
          <div className="btns">
            <Button href="/" arrow>
              {t('notFound.home')}
            </Button>
          </div>
        </Container>
      </Section>
    </Page>
  );
}
