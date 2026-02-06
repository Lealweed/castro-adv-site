import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/ui/layouts/AppLayout';
import { PublicLayout } from '@/ui/layouts/PublicLayout';

import { LandingPage } from '@/ui/pages/LandingPage';
import { DashboardPage } from '@/ui/pages/DashboardPage';
import { ClientsPage } from '@/ui/pages/ClientsPage';
import { ClientDetailsPage } from '@/ui/pages/ClientDetailsPage';
import { FinancePage } from '@/ui/pages/FinancePage';
import { AiReportsPage } from '@/ui/pages/AiReportsPage';
import { ClientPortalPage } from '@/ui/pages/ClientPortalPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* App */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/clientes" element={<ClientsPage />} />
          <Route path="/app/clientes/:clientId" element={<ClientDetailsPage />} />
          <Route path="/app/financeiro" element={<FinancePage />} />
          <Route path="/app/relatorios-ia" element={<AiReportsPage />} />
          <Route path="/app/portal" element={<ClientPortalPage />} />
          <Route path="/app/configuracoes" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

