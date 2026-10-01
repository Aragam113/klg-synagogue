import { useSiteContacts } from '@/ui/layout/slots/use-site-contacts';

import { useSections } from '../visit-shared/ui';

import { contactsModel } from './model';
import { ContactsView } from './view';

export const ContactsScreen = () => {
  const { c, lang } = useSections();
  const { socials } = useSiteContacts();
  return <ContactsView {...contactsModel(c, lang, socials)} />;
};
