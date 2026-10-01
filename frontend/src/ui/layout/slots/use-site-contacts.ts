/** Contacts for the current language — `/settings/public` first, `src/config/site.ts` as fallback. */
import { useLang } from '@/i18n/use-lang';
import { useGetPublicSettingsQuery } from '@/store/api/content';

import { pickContacts, type SiteContacts } from './contacts';

export const useSiteContacts = (): SiteContacts => {
  const { lang } = useLang();
  const q = useGetPublicSettingsQuery({ lang });
  return pickContacts(q.data);
};
