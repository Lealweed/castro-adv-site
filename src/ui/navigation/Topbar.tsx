import {
  Activity,
  Bell,
  Calculator,
  CalendarClock,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Globe,
  HardDrive,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Radar,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  UsersRound,
  Wallet,
  Webhook,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/authStore';
import { getStoredTheme, setTheme, type AppTheme } from '@/lib/theme';
import { NotificationsBell } from '@/ui/components/NotificationsBell';
import { cn } from '@/ui/utils/cn';

type RouteMeta = {
  to: string;
  label: string;
  section: string;
  icon: LucideIcon;
  keywords: string;
  end?: boolean;
};

const QUICK_ROUTES: RouteMeta[] = [
  { to: '/app', label: 'Dashboard Executivo', section: 'Comando', icon: LayoutGrid, keywords: 'inicio visao geral kpi radar', end: true },
  { to: '/app/produtividade', label: 'Produtividade', section: 'Comando', icon: Activity, keywords: 'semanal checklist relatorio equipe' },
  { to: '/app/notificacoes', label: 'Central de Notificações', section: 'Comando', icon: Bell, keywords: 'alertas sino avisos' },
  { to: '/app/clientes', label: 'Clientes', section: 'Jurídico', icon: UsersRound, keywords: 'contatos cpf cnpj cadastro' },
  { to: '/app/triagem', label: 'Triagem / Leads', section: 'Jurídico', icon: Inbox, keywords: 'atendimento inicial leads funil' },
  { to: '/app/casos', label: 'Casos & Processos', section: 'Jurídico', icon: Scale, keywords: 'processos acoes tribunal cnj' },
  { to: '/app/publicacoes', label: 'PJe / Intimações', section: 'Jurídico', icon: Radar, keywords: 'diario oficial publicacoes pje' },
  { to: '/app/calculadora', label: 'Calculadora CPC', section: 'Jurídico', icon: Calculator, keywords: 'prazos uteis dias feriados cpc' },
  { to: '/app/agenda', label: 'Agenda', section: 'Operação', icon: CalendarClock, keywords: 'audiencias prazos compromissos' },
  { to: '/app/tarefas', label: 'Tarefas', section: 'Operação', icon: ListChecks, keywords: 'atividades demandas sla', end: true },
  { to: '/app/tarefas/kanban', label: 'Quadro Kanban', section: 'Operação', icon: KanbanSquare, keywords: 'colunas esteira fluxo drag' },
  { to: '/app/financeiro', label: 'Financeiro', section: 'Operação', icon: Wallet, keywords: 'asaas honorarios receitas despesas' },
  { to: '/app/drive', label: 'Smart Drive', section: 'Operação', icon: HardDrive, keywords: 'documentos arquivos cofre pdf docx' },
  { to: '/app/relatorios-ia', label: 'Relatórios com IA', section: 'Inteligência', icon: Sparkles, keywords: 'inteligencia executiva parecer ia' },
  { to: '/app/integracoes', label: 'Integrações & API', section: 'Inteligência', icon: Webhook, keywords: 'n8n whatsapp asaas webhook chaves' },
  { to: '/portal', label: 'Portal do Cliente', section: 'Inteligência', icon: Globe, keywords: 'portal vip pin assinatura' },
  { to: '/app/configuracoes', label: 'Configurações', section: 'Sistema', icon: SlidersHorizontal, keywords: 'escritorio membros perfil whatsapp' },
  { to: '/app/configuracoes/equipe', label: 'Gestão de Equipe', section: 'Sistema', icon: UsersRound, keywords: 'colaboradores desempenho rbac' },
  { to: '/app/configuracoes/auditoria', label: 'Auditoria & Segurança', section: 'Sistema', icon: ShieldCheck, keywords: 'logs historico rastreio' },
];

function resolveCurrentRoute(pathname: string): RouteMeta {
  if (pathname === '/app') return QUICK_ROUTES[0];
  const sorted = [...QUICK_ROUTES]
    .filter((r) => r.to !== '/app')
    .sort((a, b) => b.to.length - a.to.length);
  return sorted.find((r) => pathname.startsWith(r.to)) || QUICK_ROUTES[0];
}

const mobileItems = QUICK_ROUTES.filter(
  (r) => !['/app/configuracoes/equipe', '/app/configuracoes/auditoria'].includes(r.to),
);

type TopbarProps = {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
};

export function Topbar({ sidebarCollapsed = false, onToggleSidebar }: TopbarProps) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme());
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');

  const currentRoute = useMemo(() => resolveCurrentRoute(location.pathname), [location.pathname]);
  const CurrentIcon = currentRoute.icon;

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_ROUTES.slice(0, 8);
    return QUICK_ROUTES.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        r.keywords.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 20);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
      }
    }
    function onPointerDown(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  function onToggleTheme() {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  function handleNavigate(to: string) {
    setPaletteOpen(false);
    setQuery('');
    navigate(to);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="btn-icon md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} />
            </button>

            {onToggleSidebar ? (
              <button
                onClick={onToggleSidebar}
                className="btn-icon hidden md:inline-flex"
                aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                title={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              >
                {sidebarCollapsed ? (
                  <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            ) : null}

            <div className="flex min-w-0 items-center gap-2.5">
              <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/10 text-sky-300 sm:flex">
                <CurrentIcon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <span>{currentRoute.section}</span>
                  <span>/</span>
                  <span className="text-sky-300/80">CRM</span>
                </div>
                <div className="truncate text-sm font-semibold tracking-tight text-white">
                  {currentRoute.label}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Route Navigation */}
            <div ref={searchBoxRef} className="relative hidden sm:block">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-white/80 transition-colors focus-within:border-sky-400/45 focus-within:bg-slate-950/90">
                <Search className="h-3.5 w-3.5 text-sky-300/75" strokeWidth={1.75} />
                <input
                  ref={searchInputRef}
                  value={query}
                  onFocus={() => setPaletteOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPaletteOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredRoutes[0]) {
                      e.preventDefault();
                      handleNavigate(filteredRoutes[0].to);
                    }
                  }}
                  className="w-44 bg-transparent text-xs text-white outline-none placeholder:text-white/45 lg:w-60"
                  placeholder="Ir para tela ou módulo..."
                  aria-label="Navegação rápida"
                />
                <kbd className="hidden items-center gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-white/50 lg:inline-flex">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>

              {paletteOpen ? (
                <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950/95 p-1.5 shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-xl">
                  <div className="px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Acesso rápido aos módulos
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-0.5">
                    {filteredRoutes.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-white/50">
                        Nenhum módulo encontrado para &ldquo;{query}&rdquo;.
                      </div>
                    ) : (
                      filteredRoutes.map((route) => (
                        <button
                          key={route.to}
                          type="button"
                          onClick={() => handleNavigate(route.to)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition-colors hover:bg-sky-400/10 hover:text-white"
                        >
                          <span className="flex items-center gap-2.5 text-white/85">
                            <route.icon className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
                            <span className="font-medium">{route.label}</span>
                          </span>
                          <span className="font-mono text-[10px] uppercase text-white/40">
                            {route.section}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="btn-icon"
              aria-label="Alternar tema claro/escuro"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
              ) : (
                <Moon className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
              )}
            </button>

            <NotificationsBell />

            {auth.isAuthenticated ? (
              <button
                type="button"
                onClick={() => void auth.signOut()}
                className="btn-ghost !px-3 !py-1.5 !text-xs hidden sm:inline-flex"
                title="Encerrar sessão"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                Sair
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="relative flex w-72 flex-col border-r border-white/[0.08] bg-slate-950 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brand/logo.jpg"
                  alt="Castro & Oliveira"
                  className="size-8 rounded-lg border border-sky-400/25 object-cover"
                />
                <span className="text-sm font-semibold text-white">Castro & Oliveira</span>
              </div>
              <button onClick={() => setMenuOpen(false)} className="btn-icon" aria-label="Fechar menu">
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
              {mobileItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      isActive
                        ? 'bg-sky-500/15 text-white ring-1 ring-sky-400/40'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <it.icon className="h-4 w-4 text-sky-400" strokeWidth={1.85} />
                  {it.label}
                </NavLink>
              ))}
              <div className="mt-4 border-t border-white/[0.08] pt-4">
                <button
                  onClick={() => {
                    void auth.signOut();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Sair do sistema
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
