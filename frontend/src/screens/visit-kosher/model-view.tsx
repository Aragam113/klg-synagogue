import { useSections } from '../visit-shared/ui';

import { kosherModel } from './model';
import { KosherView } from './view';

export const KosherScreen = () => {
  const { c } = useSections();
  return <KosherView {...kosherModel(c)} />;
};
