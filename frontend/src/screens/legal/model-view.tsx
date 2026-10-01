import { useSiteContacts } from '@/ui/layout/slots/use-site-contacts';

import { useSections } from '../visit-shared/ui';

import { type LegalKind, legalModel } from './model';
import { LegalView } from './view';

const LegalScreen = ({ kind }: { kind: LegalKind }) => {
  const { c } = useSections();
  const { operator } = useSiteContacts();
  return <LegalView {...legalModel(c, kind, operator)} />;
};

export const PrivacyScreen = () => <LegalScreen kind="privacy" />;
export const ConsentScreen = () => <LegalScreen kind="consent" />;
