import { useSections } from '../visit-shared/ui';

import { aboutModel } from './model';
import { AboutView } from './view';

export const AboutScreen = () => {
  const { c } = useSections();
  return <AboutView {...aboutModel(c)} />;
};
