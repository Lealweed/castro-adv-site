import { Navigate, Route, Routes } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/ui/layouts/AppLayout';
import { AuthLayout } from '@/ui/layouts/AuthLayout';
import { PublicLayout } from '@/ui/layouts/PublicLayout';

import { LandingPage } from '@/ui/pages/LandingPage';
import { DashboardPage } from '@/ui/pages/DashboardPage';
import { ClientsPage } from '@/ui/pages/ClientsPage';
import { ClientDetailsPage } from '@/ui/pages/ClientDetailsPage';
import { FinancePage } from '@/ui/pages/FinancePage';
import { AiReportsPage } from '@/ui/pages/AiReportsPage';
import { ClientPortalPage } from '@/ui/pages/ClientPortalPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';
import { LoginPage } from '@/ui/pages/LoginPage';
import { OrgSelectPage } from '@/ui/pages/OrgSelectPage';
import { RequireAuth } from '@/auth/RequireAuth';
import { CasesPage } from '@/ui/pages/CasesPage';
import { CaseDetailsPage } from '@/ui/pages/CaseDetailsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
        </Route>

        {/* Auth (no sidebar) */}
        <Route element={<AuthLayout />}>
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/app/selecionar-organizacao" element={<OrgSelectPage />} />
        </Route>

        {/* App (protected) */}
        <Route element={<AppLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/clientes" element={<ClientsPage />} />
            <Route path="/app/clientes/:clientId" element={<ClientDetailsPage />} />
            <Route path="/app/casos" element={<CasesPage />} />
            <Route path="/app/casos/:caseId" element={<CaseDetailsPage />} />
            <Route path="/app/financeiro" element={<FinancePage />} />
            <Route path="/app/relatorios-ia" element={<AiReportsPage />} />
            <Route path="/app/portal" element={<ClientPortalPage />} />
            <Route path="/app/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

