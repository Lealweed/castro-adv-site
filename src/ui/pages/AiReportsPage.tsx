import { Card } from '@/ui/widgets/Card';

export function AiReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Relatórios com IA</h1>
        <p className="text-sm text-white/60">Insights gerados (mock, sem backend).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Resumo semanal</div>
          <p className="mt-2 text-sm text-white/70">
            Nesta semana, houve aumento de demanda em direito do consumidor e 3 clientes com risco de churn.
            Recomenda-se follow-up proativo em até 48h.
          </p>
          <div className="mt-4 flex gap-2">
            <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400">
              Gerar ações
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Exportar PDF
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Riscos e prazos</div>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              '2 tarefas críticas vencem em 24h (Audiência / Contestação).',
              '1 caso com baixa atividade nos últimos 15 dias (risco de atraso).',
              'Sugestão: criar checklist padrão para onboarding de novos clientes.',
            ].map((x) => (
              <li key={x} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80">
                {x}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white">Pergunte ao seu CRM (mock)</div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="w-full flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
            placeholder="Ex.: Quais clientes precisam de follow-up esta semana?"
            disabled
          />
          <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90" disabled>
            Consultar
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Resposta (mock)</div>
          <div className="mt-1 text-sm text-white/80">
            Sugiro priorizar Ana Souza (sem contato há 10 dias), Empresa Alfa (proposta enviada) e Carlos Lima
            (documentos pendentes).
          </div>
        </div>
      </Card>
    </div>
  );
}
