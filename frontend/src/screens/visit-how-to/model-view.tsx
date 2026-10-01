import { useSections } from '../visit-shared/ui';

import { howToModel } from './model';
import { HowToView } from './view';

export const HowToScreen = () => {
  const { c, lang } = useSections();
  return <HowToView {...howToModel(c, lang)} />;
};
