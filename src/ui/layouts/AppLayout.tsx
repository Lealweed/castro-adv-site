import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from '@/ui/navigation/Sidebar';
import { Topbar } from '@/ui/navigation/Topbar';

const SIDEBAR_STORAGE_KEY = 'castrocrm.sidebar.collapsed';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-dvh w-full bg-[#050811] text-slate-100 app-bg-dark theme-dark">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        />
        <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

