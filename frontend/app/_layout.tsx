import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import { Provider } from 'react-redux';

import '../global.css';
import '@/ui/styles';
import '@/i18n';
import { store } from '@/store';
import { FONTS } from '@/ui/fonts';
import { SiteShell } from '@/ui/layout';
import { ScrollProvider } from '@/ui/motion';

/**
 * Root: store, fonts (non-blocking), scroll engine, public chrome (header/footer/cookie).
 * Routes are thin files in app/; screens live in src/screens/<name>/.
 * Slot (not Stack) so the document itself scrolls - needed for Lenis, sticky and --p.
 */
export default function RootLayout() {
  useFonts(FONTS);
  return (
    <Provider store={store}>
      <ScrollProvider>
        <SiteShell>
          <Slot />
        </SiteShell>
      </ScrollProvider>
    </Provider>
  );
}
