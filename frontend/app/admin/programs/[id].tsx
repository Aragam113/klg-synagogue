import { useLocalSearchParams } from 'expo-router';

import { EntityEditScreen } from '@/screens/admin/entity/model-view';

export default function Admin_programs_Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityEditScreen key={String(id)} entity="programs" id={String(id)} />;
}
