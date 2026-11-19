import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Bell,
  Calculator,
  CalendarClock,
  Globe,
  HardDrive,
  Inbox,
  KanbanSquare,
  LayoutGrid,
  ListChecks,
  Radar,
  Scale,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  Wallet,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/ui/utils/cn';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end?: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Comando',
    items: [
      { to: '/app', label: 'Dashboard', shortLabel: 'Dash', icon: LayoutGrid, end: true },
      { to: '/app/produtividade', label: 'Produtividade', shortLabel: 'Prod', icon: Activity },
      { to: '/app/notificacoes', label: 'Notificações', shortLabel: 'Notif', icon: Bell },
    ],
  },
  {
    title: 'Jurídico',
    items: [
      { to: '/app/clientes', label: 'Clientes', shortLabel: 'Cli', icon: UsersRound },
      { to: '/app/triagem', label: 'Triagem / Leads', shortLabel: 'Lead', icon: Inbox },
      { to: '/app/casos', label: 'Casos', shortLabel: 'Casos', icon: Scale },
      { to: '/app/publicacoes', label: 'PJe / Intimações', shortLabel: 'PJe', icon: Radar },
      { to: '/app/calculadora', label: 'Calculadora CPC', shortLabel: 'CPC', icon: Calculator },
    ],
  },
  {
    title: 'Operação',
    items: [
      { to: '/app/agenda', label: 'Agenda', shortLabel: 'Agd', icon: CalendarClock },
      { to: '/app/tarefas', label: 'Tarefas', shortLabel: 'Tar', icon: ListChecks, end: true },
      { to: '/app/tarefas/kanban', label: 'Kanban', shortLabel: 'Kbn', icon: KanbanSquare },
      { to: '/app/financeiro', label: 'Financeiro', shortLabel: 'Fin', icon: Wallet },
      { to: '/app/drive', label: 'Smart Drive', shortLabel: 'Drv', icon: HardDrive },
    ],
  },
  {
    title: 'Inteligência',
    items: [
      { to: '/app/relatorios-ia', label: 'Relatórios com IA', shortLabel: 'IA', icon: Sparkles },
      { to: '/app/integracoes', label: 'Integrações & API', shortLabel: 'API', icon: Webhook },
      { to: '/portal', label: 'Portal do Cliente', shortLabel: 'Portal', icon: Globe },
      { to: '/app/configuracoes', label: 'Configurações', shortLabel: 'Cfg', icon: SlidersHorizontal },
    ],
  },
];

type SidebarProps = {
  collapsed?: boolean;
};

export function Sidebar({ collapsed = false }: SidebarProps) {
  const [userName, setUserName] = useState<string>('Carregando...');

  const userInitials = useMemo(() => {
    const source = userName === 'Carregando...' ? 'CO' : userName;
    return (
      source
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'CO'
    );
  }, [userName]);

  useEffect(() => {
    (async () => {
      try {
        const sb = requireSupabase();
        const user = await getAuthedUser();

        const { data: profile } = await sb
          .from('user_profiles')
          .select('display_name, email')
          .eq('user_id', user.id)
          .maybeSingle();

        const name = profile?.display_name || profile?.email?.split('@')[0] || 'Usuário';
        setUserName(name);
      } catch {
        setUserName('Usuário');
      }
    })();
  }, []);

  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-white/[0.08] bg-slate-950/75 backdrop-blur-xl transition-all duration-300 md:sticky md:top-0 md:flex md:h-dvh md:flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/[0.08]',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4',
        )}
      >
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sky-400/25 bg-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.16)]">
          <img
            src="/brand/logo.jpg"
            alt="Castro & Oliveira"
            className="h-full w-full object-cover"
            loading="eager"
          />
          <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>

        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight text-white">Castro & Oliveira</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-sky-300/80">
              <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
              LEGAL OS · CRM
            </div>
          </div>
        ) : null}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed ? (
              <div className="mb-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                {group.title}
              </div>
            ) : (
              <div className="mx-auto my-2 h-px w-8 bg-white/[0.08]" />
            )}

            <div className="space-y-0.5">
              {group.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex rounded-xl py-2 text-sm font-medium transition-all duration-150',
                      collapsed ? 'justify-center px-2 py-2.5' : 'items-center gap-3 px-3',
                      isActive
                        ? 'bg-sky-400/10 text-white ring-1 ring-sky-400/20'
                        : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive ? (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.85)]" />
                      ) : null}

                      <it.icon
                        className={cn(
                          'h-[17px] w-[17px] shrink-0 transition-colors',
                          isActive ? 'text-sky-300' : 'text-white/55 group-hover:text-sky-300',
                        )}
                        strokeWidth={1.75}
                      />

                      <span className={cn('truncate', collapsed && 'sr-only')}>{it.label}</span>

                      {collapsed ? (
                        <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-30 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/[0.1] bg-slate-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100">
                          {it.label}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom User Tile */}
      <div className="mt-auto shrink-0 border-t border-white/[0.08] p-3">
        <div
          className={cn(
            'rounded-xl border border-white/[0.08] bg-white/[0.04]',
            collapsed ? 'px-1.5 py-2.5 text-center' : 'flex items-center gap-3 p-2.5',
          )}
        >
          {collapsed ? (
            <div className="group relative flex flex-col items-center">
              <div className="relative flex size-10 items-center justify-center rounded-xl border border-sky-400/25 bg-gradient-to-br from-sky-400/20 to-indigo-500/15 text-xs font-bold text-white shadow-[0_6px_20px_rgba(56,189,248,0.14)]">
                {userInitials}
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <span className="pointer-events-none absolute bottom-full left-[calc(100%+0.65rem)] mb-2 hidden whitespace-nowrap rounded-lg border border-white/[0.1] bg-slate-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl group-hover:block">
                {userName}
              </span>
            </div>
          ) : (
            <>
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-gradient-to-br from-sky-400/20 to-indigo-500/15 text-xs font-bold text-white">
                {userInitials}
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-white">{userName}</div>
                <div className="truncate font-mono text-[10px] uppercase tracking-wider text-sky-300/75">
                  Conectado · Online
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
