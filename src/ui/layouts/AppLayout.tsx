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
    <div className="min-h-dvh bg-neutral-950 text-neutral-100 app-bg-dark theme-dark">
      <div className="mx-auto flex min-h-dvh max-w-[1400px]">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          />
          <main className="min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

