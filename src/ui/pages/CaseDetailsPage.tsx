import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';

type CaseRow = {
  id: string;
  title: string;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  description?: string | null;
  clientId?: string | null;
};

export function CaseDetailsPage() {
  const { caseId } = useParams();
  const [c, setC] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await apiFetch(`/cases/${caseId}`, { method: 'GET' });
      const json = await res.json().catch(() => null);

      if (!alive) return;

      if (!res.ok) {
        setError((json as any)?.message || (json as any)?.error || 'Falha ao carregar caso.');
        setLoading(false);
        return;
      }

      setC((json as any) ?? null);
      setLoading(false);
    }

    if (caseId) load();
    return () => {
      alive = false;
    };
  }, [caseId]);

  function statusLabel(s: CaseRow['status']) {
    if (s === 'OPEN') return 'Aberto';
    if (s === 'ON_HOLD') return 'Em espera';
    return 'Encerrado';
  }

  if (loading) return <div className="text-white/70">Carregando…</div>;
  if (error) return <div className="text-red-200">{error}</div>;
  if (!c) return <div className="text-white/70">Caso não encontrado.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{c.title}</h1>
        <p className="text-sm text-white/60">Detalhe do caso (API).</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Resumo</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Info label="Status" value={statusLabel(c.status)} />
            <Info label="Cliente" value={c.clientId || '—'} />
          </div>

          <div className="mt-4">
            <div className="text-xs text-white/60">Descrição</div>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              {c.description || '—'}
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Ações</div>
          <div className="mt-3 grid gap-2">
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Criar tarefa (em breve)
            </button>
            <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10">
              Anexar documento (em breve)
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
