import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';

type Contact = {
  id: string;
  name: string;
  kind: 'PERSON' | 'COMPANY';
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt?: string;
};

export function ClientDetailsPage() {
  const { clientId } = useParams();
  const [c, setC] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await apiFetch(`/contacts/${clientId}`, { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!alive) return;

      if (!res.ok) {
        setError((json as any)?.message || (json as any)?.error || 'Falha ao carregar cliente.');
        setLoading(false);
        return;
      }

      setC((json as any) ?? null);
      setLoading(false);
    }

    if (clientId) load();
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (loading) {
    return <div className="text-white/70">Carregando…</div>;
  }

  if (error) {
    return <div className="text-red-200">{error}</div>;
  }

  if (!c) {
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
        <h1 className="text-2xl font-semibold text-white">{c.name}</h1>
        <p className="text-sm text-white/60">Detalhe do cliente (API).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Informações</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Tipo" value={c.kind === 'PERSON' ? 'Pessoa' : 'Empresa'} />
            <Info label="Documento" value={c.document || '—'} />
            <Info label="Telefone" value={c.phone || '—'} />
            <Info label="E-mail" value={c.email || '—'} />
          </div>

          <div className="mt-4">
            <div className="text-xs text-white/60">Observações</div>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              {c.notes || '—'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Ações</div>
          <div className="mt-3 grid gap-2">
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Criar caso (em breve)
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Registrar atividade (em breve)
            </button>
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
