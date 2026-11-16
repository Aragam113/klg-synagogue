import { IS_DEMO } from '@/config/demo';
import { useLang } from '@/i18n/use-lang';

import { Link } from './link';

export const DemoNotice = ({ id }: { id: string }) => {
  const { t } = useLang();
  return IS_DEMO ? (
    <aside id={id} className="demo-notice" data-demo-notice>
      <strong>{t('demo.badge')}</strong>
      <p>{t('demo.formNotice')}</p>
      <Link href="/contacts">{t('demo.contact')} →</Link>
    </aside>
  ) : null;
};
