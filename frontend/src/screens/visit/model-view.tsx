import { useSections } from '../visit-shared/ui';

import { visitModel } from './model';
import { VisitView } from './view';

export const VisitScreen = () => {
  const { c } = useSections();
  return <VisitView {...visitModel(c)} />;
};
