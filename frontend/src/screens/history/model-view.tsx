import { useSections } from '../visit-shared/ui';

import { historyModel } from './model';
import { HistoryView } from './view';

export const HistoryScreen = () => {
  const { c, t } = useSections();
  return <HistoryView {...historyModel(c, t('timeline'))} />;
};
