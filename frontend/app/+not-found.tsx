import { type Href, Redirect, usePathname } from 'expo-router';

import { useLang } from '@/i18n/use-lang';
import { MagenDavid } from '@/ui/judaica';
import { Button, Container, Page, Section, Text, Title } from '@/ui/kit';

export default function NotFound() {
  const { t } = useLang();
  const pathname = usePathname();
  // Routes are lowercase: /Visit/Hours → /visit/hours (GitHub Pages is case-sensitive, a typed address may not be).
  if (/[A-Z]/.test(pathname)) return <Redirect href={pathname.toLowerCase() as Href} />;
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
