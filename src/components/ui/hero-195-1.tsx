import { Activity, CalendarClock, GitBranch, KanbanSquare, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BorderBeam } from '@/components/ui/border-beam';

export function Hero1951() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-950/55 p-6 backdrop-blur-xl md:p-8">
      <BorderBeam colorFrom="#38bdf8" colorTo="#6366f1" />

      <div className="relative z-10 grid gap-6 md:grid-cols-2 md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
            Legal OS · Operando em Tempo Real
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Controle total do escritório em um só lugar
          </h2>
          <p className="mt-2 text-sm text-white/65">
            Clientes, processos, prazos, agenda e auditoria conectados em esteira única de alta precisão.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/app/tarefas/kanban" className="btn-primary">
              <KanbanSquare className="h-4 w-4" strokeWidth={1.75} />
              Kanban
            </Link>
            <Link to="/app/agenda" className="btn-ghost">
              <CalendarClock className="h-4 w-4" strokeWidth={1.75} />
              Agenda
            </Link>
            <Link to="/app/casos" className="btn-ghost">
              <Scale className="h-4 w-4" strokeWidth={1.75} />
              Casos
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <Activity className="h-3.5 w-3.5" strokeWidth={1.75} />
              Gargalos Operacionais
            </div>
            <div className="mt-1.5 text-sm font-semibold text-white">Monitoramento proativo de SLAs</div>
            <div className="mt-1 text-xs text-white/60">Acompanhe o gráfico de risco para agir antes do vencimento dos prazos.</div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-slate-950/60 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <GitBranch className="h-3.5 w-3.5" strokeWidth={1.75} />
              Esteira Jurídica
            </div>
            <div className="mt-1.5 text-sm font-semibold text-white">Delegar → Revisar → Protocolar</div>
            <div className="mt-1 text-xs text-white/60">Acompanhe demandas delegadas e conclusões por responsável em tempo real.</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
    </div>
  );
}
