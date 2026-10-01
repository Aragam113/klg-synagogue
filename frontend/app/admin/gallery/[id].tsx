import { useLocalSearchParams } from 'expo-router';

import { EntityEditScreen } from '@/screens/admin/entity/model-view';

export default function Admin_gallery_Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityEditScreen key={String(id)} entity="albums" id={String(id)} />;
}
