import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { TaskAttachmentsSection } from '@/ui/widgets/TaskAttachmentsSection';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status_v2: string | null;
  priority: string;
  due_at: string | null;
  created_at: string;
  client_id: string | null;
  case_id: string | null;
  client?: { id: string; name: string }[] | null;
  case?: { id: string; title: string }[] | null;
};

function fmtDT(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function TaskDetailsPage() {
  const { taskId } = useParams();
  const [row, setRow] = useState<TaskRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: qErr } = await sb
        .from('tasks')
        .select(
          'id,title,description,status_v2,priority,due_at,created_at,client_id,case_id, client:clients(id,name), case:cases(id,title)',
        )
        .eq('id', taskId)
        .maybeSingle();

      if (qErr) throw new Error(qErr.message);
      setRow((data as any) || null);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar tarefa.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tarefa</h1>
          <p className="text-sm text-white/60">Detalhes e anexos.</p>
        </div>
        <Link to="/app/tarefas" className="btn-ghost">
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

            {row.description ? (
              <div>
                <div className="text-xs text-white/50">Descrição</div>
                <div className="text-sm text-white/80">{row.description}</div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-xs text-white/50">Status</div>
                <div className="text-sm text-white/80">{row.status_v2 || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-white/50">Prioridade</div>
                <div className="text-sm text-white/80">{row.priority}</div>
              </div>
              <div>
                <div className="text-xs text-white/50">Prazo</div>
                <div className="text-sm text-white/80">{fmtDT(row.due_at)}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-white/50">Cliente</div>
                {row.client?.[0] ? (
                  <Link className="link-accent" to={`/app/clientes/${row.client[0].id}`}>
                    {row.client[0].name}
                  </Link>
                ) : (
                  <div className="text-sm text-white/70">—</div>
                )}
              </div>
              <div>
                <div className="text-xs text-white/50">Caso</div>
                {row.case?.[0] ? (
                  <Link className="link-accent" to={`/app/casos/${row.case[0].id}`}>
                    {row.case[0].title}
                  </Link>
                ) : (
                  <div className="text-sm text-white/70">—</div>
                )}
              </div>
            </div>

            <div className="text-xs text-white/40">Criada em: {fmtDT(row.created_at)}</div>
          </div>
        ) : null}
      </Card>

      {!loading && row ? (
        <TaskAttachmentsSection taskId={row.id} clientId={row.client_id} caseId={row.case_id} />
      ) : null}
    </div>
  );
}
