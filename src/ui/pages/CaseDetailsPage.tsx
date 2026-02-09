import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { fetchDatajudLastMovement } from '@/lib/datajud';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type CaseRow = {
  id: string;
  title: string;
  status: string;
  description: string | null;
  created_at: string;
  client_id: string | null;
  client?: { id: string; name: string }[] | null;
  process_number: string | null;
  datajud_last_movement_text: string | null;
  datajud_last_movement_at: string | null;
  datajud_last_checked_at: string | null;
};

export function CaseDetailsPage() {
  const { caseId } = useParams();
  const [row, setRow] = useState<CaseRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [processNumber, setProcessNumber] = useState('');
  const [checking, setChecking] = useState(false);

  async function load() {
    if (!caseId) return;

    try {
      setLoading(true);
      setError(null);

      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: qErr } = await sb
        .from('cases')
        .select(
          'id,title,status,description,created_at,client_id, client:clients(id,name), process_number, datajud_last_movement_text, datajud_last_movement_at, datajud_last_checked_at',
        )
        .eq('id', caseId)
        .maybeSingle();

      if (qErr) throw new Error(qErr.message);
      setRow((data as any) || null);
      setProcessNumber((data as any)?.process_number || '');
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function saveProcessNumber() {
    if (!caseId) return;
    try {
      setError(null);
      const sb = requireSupabase();
      await getAuthedUser();

      const { error: uErr } = await sb
        .from('cases')
        .update({ process_number: processNumber.trim() || null })
        .eq('id', caseId);

      if (uErr) throw new Error(uErr.message);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao salvar número do processo.');
    }
  }

  async function consultDatajud() {
    if (!caseId) return;
    if (!processNumber.trim()) {
      setError('Informe o número CNJ do processo.');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const res = await fetchDatajudLastMovement(processNumber.trim());

      const sb = requireSupabase();
      await getAuthedUser();

      const { error: uErr } = await sb
        .from('cases')
        .update({
          process_number: processNumber.trim(),
          datajud_last_movement_text: res.last_movement_text,
          datajud_last_movement_at: res.last_movement_at,
          datajud_last_checked_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (uErr) throw new Error(uErr.message);
      await load();
      setChecking(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao consultar DataJud.');
      setChecking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Caso</h1>
          <p className="text-sm text-white/60">Detalhes (Supabase).</p>
        </div>
        <Link to="/app/casos" className="btn-ghost">
          Voltar
        </Link>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}

        {!loading && row ? (
          <div className="grid gap-4">
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
                {row.client?.[0] ? (
                  <Link
                    to={`/app/clientes/${row.client[0].id}`}
                    className="link-accent"
                  >
                    {row.client[0].name}
                  </Link>
                ) : (
                  <div className="text-sm text-white/70">—</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-white/50">Descrição</div>
              <div className="text-sm text-white/80">{row.description || '—'}</div>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">DataJud (consulta sob demanda)</div>
            <div className="text-xs text-white/60">Consulta por número CNJ e salva a última movimentação.</div>
          </div>
          <button onClick={() => void consultDatajud()} disabled={checking} className="btn-primary">
            {checking ? 'Consultando…' : 'Consultar DataJud'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="md:col-span-2 text-sm text-white/80">
            Número do processo (CNJ)
            <input className="input" value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} />
          </label>
          <div className="md:mt-7">
            <button onClick={() => void saveProcessNumber()} className="btn-ghost w-full">
              Salvar CNJ
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/60">Última movimentação</div>
            <div className="mt-1 text-sm font-semibold text-white">{row?.datajud_last_movement_text || '—'}</div>
            <div className="mt-1 text-xs text-white/50">
              Mov.: {row?.datajud_last_movement_at ? new Date(row.datajud_last_movement_at).toLocaleString() : '—'} ·
              Consultado em: {row?.datajud_last_checked_at ? new Date(row.datajud_last_checked_at).toLocaleString() : '—'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
