import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { loadCasesLite, type CaseLite } from '@/lib/loadCasesLite';
import { loadClientsLite } from '@/lib/loadClientsLite';
import type { ClientLite } from '@/lib/types';
import { getMyOfficeRole } from '@/lib/roles';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type TaskStatus = 'open' | 'in_progress' | 'paused' | 'done' | 'cancelled';

type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  office_id: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | string;
  status_v2: TaskStatus;
  due_at: string | null;
  assigned_to_user_id: string | null;
  client_id: string | null;
  case_id: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  done_at: string | null;
  created_at: string;
};

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'open', label: 'Aberto' },
  { id: 'in_progress', label: 'Em andamento' },
  { id: 'paused', label: 'Pausado' },
  { id: 'done', label: 'Concluído' },
  { id: 'cancelled', label: 'Cancelado' },
];

function fmtDT(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function profileLabel(p: Profile) {
  return p.display_name || p.email || p.user_id.slice(0, 8);
}

function dueBadge(t: { due_at: string | null; status_v2: TaskStatus }) {
  if (!t.due_at) return null;
  if (t.status_v2 === 'done' || t.status_v2 === 'cancelled') return null;

  const due = new Date(t.due_at).getTime();
  const now = Date.now();
  const diffH = (due - now) / 36e5;

  if (diffH < 0) return { label: 'Atrasada', cls: 'badge border-red-400/30 bg-red-400/10 text-red-200' };
  if (diffH <= 24) return { label: 'Vence hoje', cls: 'badge badge-gold' };
  if (diffH <= 48) return { label: 'Vence em 48h', cls: 'badge border-amber-400/30 bg-amber-400/10 text-amber-200' };
  return null;
}

export function TasksKanbanPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [role, setRole] = useState<string>('');

  const [clients, setClients] = useState<ClientLite[]>([]);
  const [cases, setCases] = useState<CaseLite[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = role === 'admin';
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p] as const)), [profiles]);
  const clientsMap = useMemo(() => new Map(clients.map((c) => [c.id, c] as const)), [clients]);
  const casesMap = useMemo(() => new Map(cases.map((c) => [c.id, c] as const)), [cases]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const r = await getMyOfficeRole().catch(() => '');
      setRole(r);

      // best-effort upsert profile (names)
      try {
        await sb
          .from('user_profiles')
          .upsert(
            {
              user_id: user.id,
              email: (user as any)?.email || null,
              display_name: (user as any)?.user_metadata?.full_name || (user as any)?.user_metadata?.name || null,
            } as any,
            { onConflict: 'user_id' },
          )
          .select('user_id')
          .maybeSingle();
      } catch {
        // ignore
      }

      const [{ data, error: qErr }, clientsLite, casesLite, { data: ps }] = await Promise.all([
        sb
          .from('tasks')
          .select(
            'id,title,priority,status_v2,due_at,assigned_to_user_id,client_id,case_id,paused_at,pause_reason,cancelled_at,cancel_reason,done_at,created_at',
          )
          .order('created_at', { ascending: false })
          .limit(500),
        loadClientsLite().catch(() => [] as ClientLite[]),
        loadCasesLite().catch(() => [] as CaseLite[]),
        sb.from('user_profiles').select('user_id,display_name,email,office_id').order('created_at', { ascending: false }).limit(500),
      ]);

      if (qErr) throw new Error(qErr.message);
      setRows((data || []) as TaskRow[]);
      setClients(clientsLite);
      setCases(casesLite);
      setProfiles((ps || []) as Profile[]);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar kanban.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskRow[]>();
    for (const c of COLUMNS) map.set(c.id, []);
    for (const r of rows) {
      const k = (r.status_v2 || 'open') as TaskStatus;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    // sort: due_at then created_at
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
        const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
        if (da !== db) return da - db;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      map.set(k, arr);
    }
    return map;
  }, [rows]);

  async function setStatus(task: TaskRow, next: TaskStatus) {
    if (busyId) return;

    let patch: any = { status_v2: next };
    const nowIso = new Date().toISOString();

    if (next === 'in_progress') {
      patch.paused_at = null;
      patch.pause_reason = null;
      patch.cancelled_at = null;
      patch.cancel_reason = null;
      patch.done_at = null;
    }

    if (next === 'paused') {
      const reason = prompt('Motivo da pausa (opcional):', task.pause_reason || '') || '';
      patch.paused_at = nowIso;
      patch.pause_reason = reason.trim() || null;
    }

    if (next === 'done') {
      patch.done_at = nowIso;
      patch.paused_at = null;
      patch.pause_reason = null;
    }

    if (next === 'cancelled') {
      const reason = prompt('Motivo do cancelamento (opcional):', task.cancel_reason || '') || '';
      patch.cancelled_at = nowIso;
      patch.cancel_reason = reason.trim() || null;
    }

    setBusyId(task.id);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { error: uErr } = await sb.from('tasks').update(patch).eq('id', task.id);
      if (uErr) throw new Error(uErr.message);

      // optimistic update
      setRows((prev) => prev.map((t) => (t.id === task.id ? ({ ...t, ...patch } as any) : t)));
      setBusyId(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar tarefa.');
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tarefas</h1>
          <p className="text-sm text-white/60">Kanban (visão rápida).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/tarefas" className="btn-ghost">
            Lista
          </Link>
          <button onClick={() => void load()} className="btn-ghost" disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const list = byStatus.get(col.id) || [];
          return (
            <Card key={col.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{col.label}</div>
                  <div className="text-xs text-white/50">{list.length} tarefa(s)</div>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {loading ? <div className="text-sm text-white/60">Carregando…</div> : null}

                {!loading && !list.length ? <div className="text-sm text-white/60">—</div> : null}

                {list.map((t) => {
                  const due = dueBadge(t);
                  const assignee = t.assigned_to_user_id ? profileMap.get(t.assigned_to_user_id) : null;
                  const client = t.client_id ? clientsMap.get(t.client_id) : null;
                  const kase = t.case_id ? casesMap.get(t.case_id) : null;

                  return (
                    <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/app/tarefas/${t.id}`} className="text-sm font-semibold text-white hover:underline">
                          {t.title}
                        </Link>
                        {due ? <span className={due.cls}>{due.label}</span> : null}
                      </div>

                      <div className="mt-2 text-xs text-white/60">
                        <div>Responsável: {assignee ? profileLabel(assignee) : t.assigned_to_user_id ? t.assigned_to_user_id.slice(0, 8) : '—'}</div>
                        {client ? <div>Cliente: {client.name}</div> : null}
                        {kase ? <div>Caso: {kase.title}</div> : null}
                        {t.due_at ? <div>Prazo: {fmtDT(t.due_at)}</div> : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs"
                          disabled={busyId === t.id}
                          onClick={() => void setStatus(t, 'in_progress')}
                        >
                          Start
                        </button>
                        <button
                          className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs"
                          disabled={busyId === t.id}
                          onClick={() => void setStatus(t, 'paused')}
                        >
                          Pausar
                        </button>
                        <button
                          className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs"
                          disabled={busyId === t.id}
                          onClick={() => void setStatus(t, 'done')}
                        >
                          Concluir
                        </button>
                        {isAdmin ? (
                          <button
                            className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs"
                            disabled={busyId === t.id}
                            onClick={() => void setStatus(t, 'cancelled')}
                          >
                            Cancelar
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-2 text-[11px] text-white/40">Status: {t.status_v2}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
