import { useSections } from '../visit-shared/ui';

import { museumModel } from './model';
import { MuseumView } from './view';

export const MuseumScreen = () => {
  const { c, lang } = useSections();
  return <MuseumView {...museumModel(c, lang)} />;
};
