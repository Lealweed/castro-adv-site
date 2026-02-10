import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { RequireRole } from '@/auth/RequireRole';
import { AuthLayout } from '@/ui/layouts/AuthLayout';
import { AppLayout } from '@/ui/layouts/AppLayout';
import { PublicLayout } from '@/ui/layouts/PublicLayout';

import { LandingPage } from '@/ui/pages/LandingPage';
import { HelixDemoPage } from '@/ui/pages/HelixDemoPage';
import { LoginPage } from '@/ui/pages/LoginPage';

import { DashboardPage } from '@/ui/pages/DashboardPage';
import { ClientsPage } from '@/ui/pages/ClientsPage';
import { ClientDetailsPage } from '@/ui/pages/ClientDetailsPage';
import { CasesPage } from '@/ui/pages/CasesPage';
import { CaseDetailsPage } from '@/ui/pages/CaseDetailsPage';

import { FinancePage } from '@/ui/pages/FinancePage';
import { FinanceTxDetailsPage } from '@/ui/pages/finance/FinanceTxDetailsPage';
import { PartnersPage } from '@/ui/pages/finance/PartnersPage';
import { PayablesPage } from '@/ui/pages/finance/PayablesPage';
import { AiReportsPage } from '@/ui/pages/AiReportsPage';
import { ClientPortalPage } from '@/ui/pages/ClientPortalPage';
import { SettingsPage } from '@/ui/pages/SettingsPage';
import { AuditPage } from '@/ui/pages/AuditPage';
import { AgendaPage } from '@/ui/pages/AgendaPage';
import { TasksPage } from '@/ui/pages/TasksPage';
import { TaskDetailsPage } from '@/ui/pages/TaskDetailsPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<HelixDemoPage />} />
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
            <Route path="/app/tarefas/:taskId" element={<TaskDetailsPage />} />
            <Route element={<RequireRole allowed={["admin", "finance"]} />}>
              <Route path="/app/financeiro" element={<FinancePage />} />
              <Route path="/app/financeiro/parceiros" element={<PartnersPage />} />
              <Route path="/app/financeiro/a-pagar" element={<PayablesPage />} />
              <Route path="/app/financeiro/:txId" element={<FinanceTxDetailsPage />} />
            </Route>

            <Route path="/app/relatorios-ia" element={<AiReportsPage />} />
            <Route path="/app/portal" element={<ClientPortalPage />} />
            <Route path="/app/configuracoes" element={<SettingsPage />} />

            <Route element={<RequireRole allowed={["admin"]} />}>
              <Route path="/app/configuracoes/auditoria" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
