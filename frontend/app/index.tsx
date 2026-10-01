import { useLang } from '@/i18n/use-lang';
import { Preloader } from '@/scenes/preloader';
import { HomeScreen } from '@/screens/home/model-view';
import { Page } from '@/ui/kit';

/** `/` — the home page: preloader, scroll scene of the synagogue and the live sections. */
export default function Home() {
  const { t } = useLang('home');
  return (
    <Page title={t('title')}>
      <Preloader />
      <HomeScreen />
    </Page>
  );
}
