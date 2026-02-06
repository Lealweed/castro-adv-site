import { Card } from '@/ui/widgets/Card';

export function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Financeiro</h1>
        <p className="text-sm text-white/60">Receitas, despesas e previsões (mock).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="text-xs text-white/60">Recebido (mês)</div>
          <div className="mt-2 text-2xl font-semibold text-white">R$ 24.300</div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">A receber</div>
          <div className="mt-2 text-2xl font-semibold text-white">R$ 11.800</div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">Inadimplência</div>
          <div className="mt-2 text-2xl font-semibold text-white">R$ 2.100</div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white">Últimos lançamentos</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-white/50">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { d: '05/02', c: 'Ana Souza', x: 'Honorários iniciais', v: 'R$ 1.500', s: 'Pago' },
                { d: '03/02', c: 'Empresa Alfa', x: 'Aditivo contrato', v: 'R$ 3.200', s: 'A receber' },
                { d: '01/02', c: 'Carlos Lima', x: 'Consulta', v: 'R$ 350', s: 'Pago' },
              ].map((r, i) => (
                <tr key={i} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white/70">{r.d}</td>
                  <td className="px-4 py-3 font-medium text-white">{r.c}</td>
                  <td className="px-4 py-3 text-white/70">{r.x}</td>
                  <td className="px-4 py-3 text-white">{r.v}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                      {r.s}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
