import { Slot, usePathname } from 'expo-router';

import { IS_DEMO } from '@/config/demo';
import { AdminGate } from '@/screens/admin/shared/gate';
import { AdminShell } from '@/screens/admin/shared/shell';
import { DemoAdminPage } from '@/ui/layout/demo';

/** /admin/*: login is bare, everything else is behind AdminGate + side menu. */
export default function AdminLayout() {
  const pathname = usePathname();
  if (IS_DEMO) return <DemoAdminPage />;
  if (pathname === '/admin/login') return <Slot />;
  return (
    <AdminGate>
      <AdminShell>
        <Slot />
      </AdminShell>
    </AdminGate>
  );
}
