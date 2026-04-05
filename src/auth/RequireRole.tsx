import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { requireRole } from '@/lib/roles';

export function RequireRole({ allowed }: { allowed: string[] }) {
  const loc = useLocation();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const yes = await requireRole(allowed);
        if (!alive) return;
        setOk(yes);
      } catch {
        if (!alive) return;
        setOk(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [allowed.join('|')]);

  if (ok === null) {
    return <div className="p-4 text-sm text-white/70">Verificando permissões…</div>;
  }

  if (!ok) {
    return <Navigate to="/app" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
