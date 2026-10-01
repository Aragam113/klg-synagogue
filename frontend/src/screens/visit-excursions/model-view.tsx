import { useSections } from '../visit-shared/ui';

import { excursionsModel } from './model';
import { ExcursionsView } from './view';

export const ExcursionsScreen = () => {
  const { c, lang } = useSections();
  return <ExcursionsView {...excursionsModel(c, lang)} />;
};
