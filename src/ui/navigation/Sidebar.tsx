import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BellRing,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  Cog,
  Coins,
  HardDrive,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  ClipboardList,
  Users,
} from 'lucide-react';

import { cn } from '@/ui/utils/cn';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

const items = [
  { to: '/app', label: 'Dashboard', shortLabel: 'Dash', icon: LayoutDashboard },
  { to: '/app/produtividade', label: 'Produtividade', shortLabel: 'Prod', icon: TrendingUp },
  { to: '/app/clientes', label: 'Clientes', shortLabel: 'Cli', icon: Users },
  { to: '/app/triagem', label: 'Triagem / Leads', shortLabel: 'Lead', icon: ClipboardList },
  { to: '/app/casos', label: 'Casos', shortLabel: 'Cas', icon: Briefcase },
  { to: '/app/notificacoes', label: 'Notificacoes', shortLabel: 'Not', icon: Bell },
  { to: '/app/publicacoes', label: 'PJe / Intimações', shortLabel: 'PJe', icon: BellRing },
  { to: '/app/agenda', label: 'Agenda', shortLabel: 'Age', icon: Calendar },
  { to: '/app/tarefas', label: 'Tarefas', shortLabel: 'Tar', icon: CheckSquare },
  { to: '/app/financeiro', label: 'Financeiro', shortLabel: 'Fin', icon: Coins },
  { to: '/app/drive', label: 'Smart Drive', shortLabel: 'Drv', icon: HardDrive },
  { to: '/app/relatorios-ia', label: 'Relatórios com IA', shortLabel: 'IA', icon: Sparkles },
  { to: '/portal', label: 'Portal do Cliente', shortLabel: 'Portal', icon: Building2 },
  { to: '/app/configuracoes', label: 'Configurações', shortLabel: 'Cfg', icon: Cog },
];

type SidebarProps = {
  collapsed?: boolean;
};

export function Sidebar({ collapsed = false }: SidebarProps) {
  const [userName, setUserName] = useState<string>('Carregando...');

  const userInitials = useMemo(() => {
    const source = userName === 'Carregando...' ? 'CO' : userName;
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'CO';
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
        'hidden shrink-0 border-r border-white/10 bg-neutral-950/70 backdrop-blur-xl transition-all duration-300 md:flex md:flex-col',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className={cn('flex h-16 items-center border-b border-white/10', collapsed ? 'justify-center px-2' : 'gap-3 px-4')}>
        {collapsed ? (
          <div className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/20 via-white/10 to-transparent shadow-[0_10px_30px_rgba(251,191,36,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.24),transparent_60%)]" />
            <span className="relative text-[11px] font-black uppercase tracking-[0.22em] text-amber-100">CO</span>
          </div>
        ) : (
          <>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <BarChart3 className="h-5 w-5 text-amber-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">CRM Jurídico</div>
              <div className="text-xs text-white/60">SaaS multi-tenant</div>
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 px-2 py-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/app'}
            className={({ isActive }) =>
              cn(
                'group relative mb-1 flex rounded-xl py-2 text-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center px-2' : 'items-center gap-3 px-3',
                isActive
                  ? 'bg-amber-400/10 text-white ring-1 ring-amber-400/20'
                  : 'text-white/70 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <it.icon className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && 'sr-only')}>{it.label}</span>

            {collapsed ? (
              <>
                <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-20 -translate-y-1/2 rounded-lg border border-white/10 bg-neutral-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition-all duration-150 group-hover:translate-x-1 group-hover:opacity-100">
                  {it.label}
                </span>
                <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {it.shortLabel}
                </span>
              </>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-3">
        <div className={cn('rounded-2xl border border-white/10 bg-white/5', collapsed ? 'px-2 py-3 text-center' : 'p-3')}>
          {collapsed ? (
            <div className="group relative">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-300/30 to-white/5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(251,191,36,0.12)]">
                {userInitials}
              </div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/70">CO</div>
              <div className="mt-1 text-[9px] text-white/40">online</div>
              <span className="pointer-events-none absolute bottom-full left-[calc(100%+0.65rem)] mb-2 hidden rounded-lg border border-white/10 bg-neutral-900/95 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] group-hover:block">
                {userName}
              </span>
            </div>
          ) : (
            <>
              <div className="text-xs font-semibold text-white">Usuário Logado</div>
              <div className="mt-1 text-sm text-white/80">{userName}</div>
              <div className="mt-2 text-[10px] uppercase font-bold text-amber-200/70 tracking-wider">Castro & Oliveira Advocacia</div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
