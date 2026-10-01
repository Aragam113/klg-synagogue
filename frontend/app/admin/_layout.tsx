import { Slot, usePathname } from 'expo-router';

import { AdminGate } from '@/screens/admin/shared/gate';
import { AdminShell } from '@/screens/admin/shared/shell';

/** /admin/* (task 09): login is bare, everything else is behind AdminGate + side menu. */
export default function AdminLayout() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return <Slot />;
  return (
    <AdminGate>
      <AdminShell>
        <Slot />
      </AdminShell>
    </AdminGate>
  );
}
