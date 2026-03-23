import { Outlet } from 'react-router-dom';

import { PublicNavbar } from '@/ui/navigation/PublicNavbar';
import { PublicFooter } from '@/ui/navigation/PublicFooter';

export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-luxury">
      <PublicNavbar />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
