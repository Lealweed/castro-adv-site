import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { getMyOfficeRole } from '@/lib/roles';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

type TeamTaskRow = {
  id: string;
  status_v2: string | null;
  due_at: string | null;
  assigned_to_user_id: string | null;
};

type ProfileLite = { user_id: string; display_name: string | null; email: string | null };

type AgendaItem = {
  id: string;
  kind: string;
  title: string;
  starts_at: string | null;
  due_date: string | null;
};

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtShort(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState<{ clients: number; cases: number }>({ clients: 0, cases: 0 });
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);

  const [role, setRole] = useState<string>('');
  const [teamTasks, setTeamTasks] = useState<TeamTaskRow[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<ProfileLite[]>([]);

  const todayStr = useMemo(() => toDateStr(new Date()), []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const sb = requireSupabase();
        await getAuthedUser();

        const roleNow = await getMyOfficeRole().catch(() => '');

        const [c1, c2, t1, a1, teamT, teamP] = await Promise.all([
          sb.from('clients').select('id', { count: 'exact', head: true }),
          sb.from('cases').select('id', { count: 'exact', head: true }),
          sb
            .from('tasks')
            .select('id,title,status,due_date,created_at')
            .neq('status', 'done')
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(5),
          // next agenda items: deadlines today + next commitments
          sb
            .from('agenda_items')
            .select('id,kind,title,starts_at,due_date')
            .or(`and(kind.eq.deadline,due_date.gte.${todayStr}),and(kind.eq.commitment,starts_at.gte.${new Date().toISOString()})`)
            .order('created_at', { ascending: false })
            .limit(5),
          roleNow === 'admin'
            ? sb
                .from('tasks')
                .select('id,status_v2,due_at,assigned_to_user_id')
                .neq('status_v2', 'done')
                .neq('status_v2', 'cancelled')
                .order('due_at', { ascending: true, nullsFirst: false })
                .limit(400)
            : Promise.resolve({ data: [], error: null } as any),
          roleNow === 'admin'
            ? sb.from('user_profiles').select('user_id,display_name,email').order('created_at', { ascending: false }).limit(200)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        setRole(roleNow);

        if (c1.error || c2.error || t1.error || a1.error || teamT.error || teamP.error) {
          throw new Error(
            c1.error?.message || c2.error?.message || t1.error?.message || a1.error?.message || teamT.error?.message || teamP.error?.message ||
              'Falha ao carregar.',
          );
        }

        if (!alive) return;

        setCounts({ clients: c1.count || 0, cases: c2.count || 0 });
        setTasks((t1.data || []) as TaskRow[]);
        setAgenda((a1.data || []) as AgendaItem[]);
        setTeamTasks((teamT.data || []) as TeamTaskRow[]);
        setTeamProfiles((teamP.data || []) as ProfileLite[]);
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
  }, [todayStr]);

  const teamStats = useMemo(() => {
    if (role !== 'admin') return null;

    const now = Date.now();
    const openish = teamTasks;

    function badgeKind(dueAt: string | null) {
      if (!dueAt) return 'none' as const;
      const due = new Date(dueAt).getTime();
      const diffH = (due - now) / 36e5;
      if (diffH < 0) return 'overdue' as const;
      if (diffH <= 48) return 'due48' as const;
      return 'ok' as const;
    }

    const by = new Map<string, { total: number; overdue: number; due48: number }>();
    let overdueAll = 0;
    let due48All = 0;

    for (const t of openish) {
      const key = t.assigned_to_user_id || '—';
      const cur = by.get(key) || { total: 0, overdue: 0, due48: 0 };
      cur.total += 1;
      const k = badgeKind(t.due_at);
      if (k === 'overdue') {
        cur.overdue += 1;
        overdueAll += 1;
      }
      if (k === 'due48') {
        cur.due48 += 1;
        due48All += 1;
      }
      by.set(key, cur);
    }

    const profileMap = new Map(teamProfiles.map((p) => [p.user_id, p] as const));
    const rows = Array.from(by.entries())
      .map(([userId, s]) => ({
        userId,
        label: profileMap.get(userId)?.display_name || profileMap.get(userId)?.email || userId.slice(0, 8),
        ...s,
      }))
      .sort((a, b) => (b.overdue - a.overdue) || (b.due48 - a.due48) || (b.total - a.total));

    return { overdueAll, due48All, rows };
  }, [role, teamTasks, teamProfiles]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-white/60">Visão geral — clientes, casos, agenda e tarefas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/app/clientes" className="btn-ghost">
            Clientes
          </Link>
          <Link to="/app/casos" className="btn-ghost">
            Casos
          </Link>
          <Link to="/app/tarefas" className="btn-primary">
            Nova tarefa
          </Link>
        </div>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-xs text-white/60">Clientes</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="text-3xl font-semibold text-white">{loading ? '—' : counts.clients}</div>
            <Link className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs" to="/app/clientes">
              Abrir
            </Link>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-white/60">Casos</div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="text-3xl font-semibold text-white">{loading ? '—' : counts.cases}</div>
            <Link className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs" to="/app/casos">
              Abrir
            </Link>
          </div>
        </Card>
      </div>

      {/* Heavy finance charts removed from Dashboard to keep mobile fast. */}

      {teamStats ? (
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Equipe (gestão)</div>
              <div className="text-xs text-white/60">Pendências por responsável (admin).</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white/80">
                Críticas (48h): <span className="text-amber-200">{teamStats.due48All}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white/80">
                Atrasadas: <span className="text-red-200">{teamStats.overdueAll}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {teamStats.rows.slice(0, 8).map((r) => (
              <div key={r.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">{r.label}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="badge">{r.total} abertas</span>
                  {r.due48 ? <span className="badge badge-gold">{r.due48} (48h)</span> : null}
                  {r.overdue ? <span className="badge border-red-400/30 bg-red-400/10 text-red-200">{r.overdue} atras.</span> : null}
                </div>
              </div>
            ))}
            {teamStats.rows.length === 0 ? <div className="text-sm text-white/60">Sem tarefas pendentes.</div> : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Tarefas em aberto</div>
              <div className="text-xs text-white/60">Próximas 5</div>
            </div>
            <Link to="/app/tarefas" className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs">
              Ver todas
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
            {!loading && tasks.length === 0 ? <div className="text-sm text-white/60">Nada pendente.</div> : null}
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                <div className="mt-1 text-xs text-white/60">{t.due_date ? `Vence: ${t.due_date}` : 'Sem vencimento'}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Agenda</div>
              <div className="text-xs text-white/60">Próximos itens</div>
            </div>
            <Link to="/app/agenda" className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs">
              Abrir agenda
            </Link>
          </div>

          <div className="mt-4 grid gap-2">
            {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
            {!loading && agenda.length === 0 ? <div className="text-sm text-white/60">Nada agendado.</div> : null}
            {agenda.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">
                  {a.title}{' '}
                  <span className={a.kind === 'deadline' ? 'badge badge-gold' : 'badge'}>
                    {a.kind === 'deadline' ? 'Prazo' : 'Compromisso'}
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {a.kind === 'deadline' ? `Data: ${a.due_date || '—'}` : `Início: ${fmtShort(a.starts_at)}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
