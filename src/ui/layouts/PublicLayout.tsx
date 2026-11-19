import { Outlet } from 'react-router-dom';

import { PublicNavbar } from '@/ui/navigation/PublicNavbar';
import { PublicFooter } from '@/ui/navigation/PublicFooter';

export function PublicLayout() {
  return (
    <div className="min-h-dvh bg-[#050811] text-slate-100">
      <PublicNavbar />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
