import { IS_DEMO } from '@/config/demo';
import { useLang } from '@/i18n/use-lang';
import { MagenDavid } from '@/ui/judaica';
import { Button, Container, Page, Section, Text, Title } from '@/ui/kit';

/** Unobtrusive «Демо-версия» mark of the GitHub Pages build (nothing in ordinary builds). */
export const DemoBadge = () => {
  const { t } = useLang();
  if (!IS_DEMO) return null;
  return (
    <span
      data-demo-badge
      style={{
        display: 'inline-block',
        marginTop: '0.75rem',
        padding: '0.15rem 0.6rem',
        border: '1px solid currentColor',
        borderRadius: 999,
        fontSize: '0.75rem',
        letterSpacing: '0.04em',
        opacity: 0.7,
      }}
    >
      {t('demo.badge')}
    </span>
  );
};

/** /admin* in the demo build: there is no server to log into. */
export const DemoAdminPage = () => {
  const { t } = useLang();
  return (
    <Page title={t('demo.adminTitle')}>
      <Section tone="cream">
        <Container size="narrow">
          <MagenDavid size="3rem" strokeWidth={1} className="home-ph__mark" />
          <Title as="h1" size="xl" text={t('demo.adminTitle')} />
          <Text lead>{t('demo.adminText')}</Text>
          <div className="btns" data-demo-admin>
            <Button href="/" arrow>
              {t('demo.home')}
            </Button>
          </div>
        </Container>
      </Section>
    </Page>
  );
};
