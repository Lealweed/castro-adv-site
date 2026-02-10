import { useEffect, useMemo, useState } from 'react';

import type { AuditLogRow } from '@/lib/audit';
import { listAuditLogs } from '@/lib/audit';
import { getMyOfficeRole } from '@/lib/roles';
import { Card } from '@/ui/widgets/Card';
import { humanizeAudit } from '@/ui/widgets/timelineHumanize';

type TableName = 'all' | 'clients' | 'cases' | 'tasks' | 'documents' | 'finance_transactions';
type ActionName = 'all' | 'insert' | 'update' | 'delete';

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

function whoLabel(it: AuditLogRow) {
  const p = it.profile?.[0];
  return p?.display_name || p?.email || (it.user_id ? it.user_id.slice(0, 8) : '—');
}

export function AuditPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AuditLogRow[]>([]);

  const [role, setRole] = useState<string>('');

  const [table, setTable] = useState<TableName>('all');
  const [action, setAction] = useState<ActionName>('all');
  const [q, setQ] = useState('');

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const r = await getMyOfficeRole().catch(() => '');
      setRole(r);

      const data = await listAuditLogs({ limit: 120 });
      setRows(data);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar auditoria.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return rows.filter((it) => {
      if (table !== 'all' && it.table_name !== table) return false;
      if (action !== 'all' && it.action !== action) return false;

      if (!qq) return true;

      const h = humanizeAudit(it);
      const hay = [
        h.title,
        (h.changes || []).join(' | '),
        it.table_name,
        it.action,
        it.record_id || '',
        it.client_id || '',
        it.case_id || '',
        it.task_id || '',
        whoLabel(it),
      ]
        .join(' ')
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [rows, table, action, q]);

  if (role && role !== 'admin') {
    return (
      <Card>
        <div className="text-sm font-semibold text-white">Auditoria</div>
        <div className="mt-2 text-sm text-white/70">Apenas administradores podem acessar esta página.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Auditoria</h1>
        <p className="text-sm text-white/60">Registro de alterações (criação/edição/exclusão) no escritório.</p>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-white/80">
            Tabela
            <select className="select" value={table} onChange={(e) => setTable(e.target.value as any)}>
              <option value="all">Todas</option>
              <option value="clients">Clientes</option>
              <option value="cases">Casos</option>
              <option value="tasks">Tarefas</option>
              <option value="documents">Documentos</option>
              <option value="finance_transactions">Financeiro</option>
            </select>
          </label>

          <label className="text-sm text-white/80">
            Ação
            <select className="select" value={action} onChange={(e) => setAction(e.target.value as any)}>
              <option value="all">Todas</option>
              <option value="insert">Criado</option>
              <option value="update">Atualizado</option>
              <option value="delete">Excluído</option>
            </select>
          </label>

          <label className="text-sm text-white/80">
            Buscar
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: prazo, cliente, documento, valor…" />
          </label>
        </div>
      </Card>

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
        {!loading && filtered.length === 0 ? <div className="text-sm text-white/60">Sem registros.</div> : null}

        {!loading && filtered.length ? (
          <div className="divide-y divide-white/10">
            {filtered.map((it) => {
              const h = humanizeAudit(it);
              return (
                <div key={it.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-white/50">{fmtWhen(it.created_at)}</div>
                    <div className="text-xs text-white/50">por {whoLabel(it)}</div>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-white">{h.title}</div>

                  {h.changes.length ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-white/60">
                      {h.changes.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-2 text-xs text-white/40">
                    {it.table_name} · {it.action} · {it.record_id ? it.record_id.slice(0, 8) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
