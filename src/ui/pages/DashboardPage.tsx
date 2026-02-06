import { Card } from '@/ui/widgets/Card';
import { Stat } from '@/ui/widgets/Stat';
import { ActivityFeed } from '@/ui/widgets/ActivityFeed';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/60">Indicadores do escritório (mock).</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Leads ativos" value="48" hint="+12% no mês" />
        <Stat label="Casos em andamento" value="132" hint="5 urgentes" />
        <Stat label="Tarefas vencendo" value="9" hint="próximas 48h" />
        <Stat label="Receita prevista" value="R$ 38.400" hint="próx. 30 dias" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Visão de pipeline</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { k: 'Novo', v: 18 },
              { k: 'Em qualificação', v: 21 },
              { k: 'Proposta', v: 9 },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">{x.k}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{x.v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Atividades recentes</div>
          <ActivityFeed />
        </Card>
      </div>
    </div>
  );
}
