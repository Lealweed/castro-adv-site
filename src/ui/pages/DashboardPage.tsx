import { useEffect, useState } from 'react';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ clients: number; cases: number }>({ clients: 0, cases: 0 });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const sb = requireSupabase();
        await getAuthedUser();

        const [{ count: clientsCount, error: e1 }, { count: casesCount, error: e2 }] = await Promise.all([
          sb.from('clients').select('id', { count: 'exact', head: true }),
          sb.from('cases').select('id', { count: 'exact', head: true }),
        ]);

        if (e1 || e2) throw new Error(e1?.message || e2?.message || 'Falha ao carregar métricas.');

        if (!alive) return;
        setCounts({ clients: clientsCount || 0, cases: casesCount || 0 });
        setLoading(false);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || 'Erro ao carregar.');
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/60">Dados reais (Supabase).</p>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm text-white/60">Clientes</div>
          <div className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : counts.clients}</div>
        </Card>
        <Card>
          <div className="text-sm text-white/60">Casos</div>
          <div className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : counts.cases}</div>
        </Card>
      </div>
    </div>
  );
}
