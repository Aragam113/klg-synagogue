import { useSections } from '../visit-shared/ui';

import { hoursModel } from './model';
import { HoursView } from './view';

export const HoursScreen = () => {
  const { c } = useSections();
  return <HoursView {...hoursModel(c)} />;
};
