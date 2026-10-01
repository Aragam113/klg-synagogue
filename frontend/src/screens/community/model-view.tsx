import { useSections } from '../visit-shared/ui';

import { communityModel } from './model';
import { CommunityView } from './view';

export const CommunityScreen = () => {
  const { c } = useSections();
  return <CommunityView {...communityModel(c)} />;
};
