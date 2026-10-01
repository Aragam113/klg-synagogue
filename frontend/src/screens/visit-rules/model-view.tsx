import { useSections } from '../visit-shared/ui';

import { rulesModel } from './model';
import { RulesView } from './view';

export const RulesScreen = () => {
  const { c } = useSections();
  return <RulesView {...rulesModel(c)} />;
};
