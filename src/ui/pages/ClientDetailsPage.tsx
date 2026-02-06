import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/ui/widgets/Card';
import { clientsMock } from '@/ui/state/mocks';

export function ClientDetailsPage() {
  const { clientId } = useParams();

  const client = useMemo(() => clientsMock.find((c) => c.id === clientId), [clientId]);

  if (!client) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-white">Cliente não encontrado</h1>
        <p className="mt-2 text-sm text-white/60">ID: {clientId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{client.name}</h1>
        <p className="text-sm text-white/60">Visão 360° (mock): contatos, casos e conversas.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Resumo</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Tipo" value={client.kind} />
            <Info label="Status" value={client.status} />
            <Info label="Último contato" value={client.lastContact} />
            <Info label="Origem" value={client.source} />
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Ações rápidas</div>
          <div className="mt-3 grid gap-2">
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Criar tarefa
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Registrar atividade
            </button>
            <button className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400">
              Enviar WhatsApp
            </button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Casos vinculados</div>
          <ul className="mt-3 space-y-2 text-sm">
            {client.cases.map((x) => (
              <li key={x} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/80">
                {x}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Últimas mensagens</div>
          <div className="mt-3 space-y-2">
            {client.messages.map((m, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/50">{m.when}</div>
                <div className="mt-1 text-sm text-white/80">{m.text}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
