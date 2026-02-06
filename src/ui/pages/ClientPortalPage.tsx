import { Card } from '@/ui/widgets/Card';

export function ClientPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Portal do Cliente</h1>
        <p className="text-sm text-white/60">Uma visão simplificada para o cliente final (mock).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Status do caso</div>
          <p className="mt-2 text-sm text-white/70">
            Caso: <span className="font-semibold text-white">Ação de cobrança</span> — em andamento.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { k: 'Próxima etapa', v: 'Audiência' },
              { k: 'Data', v: '12/02' },
              { k: 'Responsável', v: 'Dra. Paula' },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">{x.k}</div>
                <div className="mt-1 text-sm font-semibold text-white">{x.v}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Documentos</div>
          <ul className="mt-3 space-y-2 text-sm">
            {['Procuração.pdf', 'Contrato.pdf', 'Comprovante.pdf'].map((x) => (
              <li key={x} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80">
                {x}
              </li>
            ))}
          </ul>
          <button className="mt-3 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90">
            Enviar documento
          </button>
        </Card>
      </div>
    </div>
  );
}
