import { useLocalSearchParams } from 'expo-router';

import { RequestCardScreen } from '@/screens/admin/requests/model-view';

export default function AdminRequestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequestCardScreen key={id} id={String(id)} />;
}
