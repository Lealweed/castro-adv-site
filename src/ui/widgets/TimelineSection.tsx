import { useEffect, useState } from 'react';

import type { AuditLogRow } from '@/lib/audit';
import { listAuditLogs } from '@/lib/audit';

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

function humanize(it: AuditLogRow) {
  const what =
    it.table_name === 'clients'
      ? 'Cliente'
      : it.table_name === 'cases'
        ? 'Caso'
        : it.table_name === 'tasks'
          ? 'Tarefa'
          : it.table_name === 'documents'
            ? 'Documento'
            : it.table_name === 'finance_transactions'
              ? 'Financeiro'
              : it.table_name;

  const action = it.action === 'insert' ? 'criado' : it.action === 'update' ? 'atualizado' : it.action === 'delete' ? 'excluído' : it.action;

  // Try to show a title-ish field
  const after = it.after_data || {};
  const before = it.before_data || {};
  const title = after.title || after.name || after.description || before.title || before.name || null;

  return title ? `${what} ${action}: ${title}` : `${what} ${action}`;
}

export function TimelineSection({ clientId, caseId, taskId }: { clientId?: string | null; caseId?: string | null; taskId?: string | null }) {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const data = await listAuditLogs({ limit: 30, clientId: clientId || undefined, caseId: caseId || undefined, taskId: taskId || undefined });
      setRows(data);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar timeline.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, caseId, taskId]);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-white">Timeline</div>
        <div className="text-xs text-white/60">Atividades recentes (auditoria).</div>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="rounded-2xl border border-white/10 bg-white/5">
        {loading ? <div className="p-4 text-sm text-white/70">Carregando…</div> : null}

        {!loading && rows.length === 0 ? <div className="p-4 text-sm text-white/60">Sem atividades.</div> : null}

        {!loading && rows.length ? (
          <div className="divide-y divide-white/10">
            {rows.map((it) => (
              <div key={it.id} className="p-4">
                <div className="text-xs text-white/50">{fmtWhen(it.created_at)}</div>
                <div className="mt-1 text-sm text-white/80">{humanize(it)}</div>
                <div className="mt-1 text-xs text-white/50">
                  {it.table_name} · {it.action}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
