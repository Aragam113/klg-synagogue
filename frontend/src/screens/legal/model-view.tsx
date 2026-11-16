import { IS_DEMO } from '@/config/demo';
import { demoLegal } from '@/content/demo-legal';
import { useSiteContacts } from '@/ui/layout/slots/use-site-contacts';

import { useSections } from '../visit-shared/ui';

import { type LegalKind, legalModel } from './model';
import { LegalView } from './view';

const LegalScreen = ({ kind }: { kind: LegalKind }) => {
  const { c, lang } = useSections();
  const { operator } = useSiteContacts();
  const props = legalModel(c, kind, operator);
  if (IS_DEMO) props.doc = demoLegal(lang, kind, props.doc.title);
  return <LegalView {...props} />;
};

export const PrivacyScreen = () => <LegalScreen kind="privacy" />;
export const ConsentScreen = () => <LegalScreen kind="consent" />;
