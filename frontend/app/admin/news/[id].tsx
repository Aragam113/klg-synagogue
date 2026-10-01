import { useLocalSearchParams } from 'expo-router';

import { EntityEditScreen } from '@/screens/admin/entity/model-view';

export default function Admin_news_Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityEditScreen key={String(id)} entity="news" id={String(id)} />;
}
