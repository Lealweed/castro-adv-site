import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type CaseRow = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  created_at: string;
  client_id: string | null;
};

export function CaseDetailsPage() {
  const { caseId } = useParams();
  const [row, setRow] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!caseId) throw new Error('Caso inválido.');

        const sb = requireSupabase();
        await getAuthedUser();

        const { data, error: qErr } = await sb
          .from('cases')
          .select('id,title,status,description,created_at,client_id')
          .eq('id', caseId)
          .maybeSingle();

        if (qErr) throw new Error(qErr.message);
        if (!alive) return;
        setRow((data as any) || null);
        setLoading(false);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || 'Falha ao carregar.');
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [caseId]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Caso</h1>
          <p className="text-sm text-white/60">Detalhes (Supabase).</p>
        </div>
        <Link
          to="/app/casos"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
        >
          Voltar
        </Link>
      </div>

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
        {error ? <div className="text-sm text-red-200">{error}</div> : null}
        {!loading && !error && row ? (
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-white/50">Título</div>
              <div className="text-lg font-semibold text-white">{row.title}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-white/50">Status</div>
                <div className="text-sm text-white/80">{row.status}</div>
              </div>
              <div>
                <div className="text-xs text-white/50">Cliente</div>
                <div className="text-sm text-white/80">{row.client_id || '—'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-white/50">Descrição</div>
              <div className="text-sm text-white/80">{row.description || '—'}</div>
            </div>
          </div>
        ) : null}

        {!loading && !error && !row ? <div className="text-sm text-white/70">Não encontrado.</div> : null}
      </Card>
    </div>
  );
}
