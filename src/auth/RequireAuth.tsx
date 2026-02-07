import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/auth/authStore';

export function RequireAuth() {
  const auth = useAuth();
  const loc = useLocation();

  if (!auth.isAuthenticated) {
    return <Navigate to="/app/login" replace state={{ from: loc.pathname }} />;
  }

  if (!auth.orgId) {
    return <Navigate to="/app/selecionar-organizacao" replace />;
  }

  return <Outlet />;
}
