import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';
import { Stat } from '@/ui/widgets/Stat';
import { ActivityFeed } from '@/ui/widgets/ActivityFeed';

type Contact = { id: string };
type CaseRow = { id: string; status: 'OPEN' | 'ON_HOLD' | 'CLOSED' };

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [cRes, kRes] = await Promise.all([
        apiFetch('/contacts', { method: 'GET' }),
        apiFetch('/cases', { method: 'GET' }),
      ]);

      const cJson = await cRes.json().catch(() => null);
      const kJson = await kRes.json().catch(() => null);

      if (!alive) return;

      if (!cRes.ok) {
        setError((cJson as any)?.message || (cJson as any)?.error || 'Falha ao carregar clientes.');
        setLoading(false);
        return;
      }

      if (!kRes.ok) {
        setError((kJson as any)?.message || (kJson as any)?.error || 'Falha ao carregar casos.');
        setLoading(false);
        return;
      }

      setContacts(((cJson as any) ?? []) as Contact[]);
      setCases(((kJson as any) ?? []) as CaseRow[]);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalClients = contacts.length;
    const totalCases = cases.length;
    const open = cases.filter((x) => x.status === 'OPEN').length;
    const onHold = cases.filter((x) => x.status === 'ON_HOLD').length;
    const closed = cases.filter((x) => x.status === 'CLOSED').length;
    return { totalClients, totalCases, open, onHold, closed };
  }, [contacts, cases]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/60">Indicadores do escritório (clientes/casos em tempo real).</p>
      </div>

      {error ? (
        <Card>
          <div className="text-sm font-semibold text-white">Atenção</div>
          <div className="mt-2 text-sm text-red-200">{error}</div>
          <div className="mt-3 text-xs text-white/60">
            Verifique login, OrgId selecionado e a API ({'api.castrodeoliveiraadv.org'}).
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={loading ? '—' : String(stats.totalClients)} hint="Cadastros" />
        <Stat label="Casos" value={loading ? '—' : String(stats.totalCases)} hint="Total" />
        <Stat label="Abertos" value={loading ? '—' : String(stats.open)} hint="Em andamento" />
        <Stat label="Em espera" value={loading ? '—' : String(stats.onHold)} hint="Aguardando" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="text-sm font-semibold text-white">Status dos casos</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {[{ k: 'Aberto', v: stats.open }, { k: 'Em espera', v: stats.onHold }, { k: 'Encerrado', v: stats.closed }].map(
              (x) => (
                <div key={x.k} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/60">{x.k}</div>
                  <div className="mt-1 text-2xl font-semibold text-white">{loading ? '—' : x.v}</div>
                </div>
              ),
            )}
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
