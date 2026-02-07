import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Building2,
  Cog,
  Coins,
  LayoutDashboard,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/ui/utils/cn';

const items = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/casos', label: 'Casos', icon: Briefcase },
  { to: '/app/financeiro', label: 'Financeiro', icon: Coins },
  { to: '/app/relatorios-ia', label: 'Relatórios com IA', icon: Sparkles },
  { to: '/app/portal', label: 'Portal do Cliente', icon: Building2 },
  { to: '/app/configuracoes', label: 'Configurações', icon: Cog },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-xl md:block">
      <div className="flex h-16 items-center gap-3 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
          <BarChart3 className="h-5 w-5 text-amber-300" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">CRM Jurídico</div>
          <div className="text-xs text-white/60">SaaS multi-tenant</div>
        </div>
      </div>

      <nav className="px-2 py-3">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/app'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs font-semibold text-white">Organização</div>
          <div className="mt-1 text-sm text-white/80">Castro de Oliveira Advocacia</div>
          <div className="mt-2 text-xs text-white/60">Plano: Pro • 12 usuários</div>
        </div>
      </div>
    </aside>
  );
}
