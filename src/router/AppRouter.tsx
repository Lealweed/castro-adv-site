import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { AuthLayout } from '@/ui/layouts/AuthLayout';
import { AppLayout } from '@/ui/layouts/AppLayout';
import { PublicLayout } from '@/ui/layouts/PublicLayout';

import { LandingPage } from '@/ui/pages/LandingPage';
import { LoginPage } from '@/ui/pages/LoginPage';

import { DashboardPage } from '@/ui/pages/DashboardPage';
import { ClientsPage } from '@/ui/pages/ClientsPage';
import { ClientDetailsPage } from '@/ui/pages/ClientDetailsPage';
import { CasesPage } from '@/ui/pages/CasesPage';
import { CaseDetailsPage } from '@/ui/pages/CaseDetailsPage';

import { FinancePage } from '@/ui/pages/FinancePage';
import { AiReportsPage } from '@/ui/pages/AiReportsPage';
import { ClientPortalPage } from '@/ui/pages/ClientPortalPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';
import { AgendaPage } from '@/ui/pages/AgendaPage';
import { TasksPage } from '@/ui/pages/TasksPage';

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
        </Route>

        {/* App (protected) */}
        <Route element={<AppLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/clientes" element={<ClientsPage />} />
            <Route path="/app/clientes/:clientId" element={<ClientDetailsPage />} />
            <Route path="/app/casos" element={<CasesPage />} />
            <Route path="/app/casos/:caseId" element={<CaseDetailsPage />} />
            <Route path="/app/agenda" element={<AgendaPage />} />
            <Route path="/app/tarefas" element={<TasksPage />} />
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
