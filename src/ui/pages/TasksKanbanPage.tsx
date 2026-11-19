import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  KanbanSquare,
  ListChecks,
  PauseCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { KanbanCard, KanbanColumn } from '@/ui/widgets/kanbanDnd';
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

type TaskSubtask = {
  id: string;
  title: string;
  is_done?: boolean;
  done?: boolean;
};

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
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
  updated_at: string | null;
  subtasks?: TaskSubtask[] | null;
};

const COLUMNS: { id: TaskStatus; label: string; accent: string; dot: string }[] = [
  { id: 'open', label: 'Aberto', accent: 'border-amber-400/25', dot: 'bg-amber-400' },
  { id: 'in_progress', label: 'Em andamento', accent: 'border-sky-400/25', dot: 'bg-sky-400' },
  { id: 'paused', label: 'Pausado', accent: 'border-orange-400/25', dot: 'bg-orange-400' },
  { id: 'done', label: 'Concluído', accent: 'border-emerald-400/25', dot: 'bg-emerald-400' },
  { id: 'cancelled', label: 'Cancelado', accent: 'border-rose-400/20', dot: 'bg-rose-400' },
];

function fmtDT(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function profileLabel(p: Profile) {
  return p.display_name || p.email?.split('@')[0] || p.user_id.slice(0, 8);
}

function priorityMeta(priority: string | null | undefined) {
  const p = (priority || 'medium').toLowerCase();
  if (p === 'high') {
    return {
      label: 'Alta',
      cls: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
      borderLeft: 'border-l-4 border-l-rose-500',
    };
  }
  if (p === 'low') {
    return {
      label: 'Baixa',
      cls: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
      borderLeft: 'border-l-4 border-l-sky-500/60',
    };
  }
  return {
    label: 'Média',
    cls: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    borderLeft: 'border-l-4 border-l-amber-400/80',
  };
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

function slaBadge(t: { due_at: string | null; status_v2: TaskStatus; priority: string }) {
  if (!t.due_at || t.status_v2 === 'done' || t.status_v2 === 'cancelled') return null;

  const due = new Date(t.due_at).getTime();
  const diffH = (due - Date.now()) / 36e5;
  const pr = (t.priority || 'medium').toLowerCase();

  if (diffH < 0) {
    return { label: 'SLA violado', cls: 'badge border-red-500/40 bg-red-500/15 text-red-200' };
  }

  const thresholds: Record<string, number> = {
    high: 24,
    medium: 48,
    low: 72,
  };

  const lim = thresholds[pr] ?? 48;
  if (diffH <= lim) {
    return { label: 'SLA em risco', cls: 'badge border-amber-400/30 bg-amber-400/10 text-amber-200' };
  }

  return { label: 'SLA ok', cls: 'badge border-emerald-400/30 bg-emerald-400/10 text-emerald-200' };
}

function staleBadge(t: { updated_at: string | null; created_at: string; status_v2: TaskStatus }) {
  if (t.status_v2 === 'done' || t.status_v2 === 'cancelled') return null;

  const lastChange = t.updated_at ? new Date(t.updated_at).getTime() : new Date(t.created_at).getTime();
  const diffDays = Math.floor((Date.now() - lastChange) / (1000 * 60 * 60 * 24));

  if (diffDays >= 7) {
    return { label: `Parada há ${diffDays}d`, cls: 'badge border-rose-500/40 bg-rose-500/15 text-rose-200' };
  }
  if (diffDays >= 3) {
    return { label: `Parada há ${diffDays}d`, cls: 'badge border-amber-400/30 bg-amber-400/10 text-amber-200' };
  }

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

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [hideCancelled, setHideCancelled] = useState(false);
  const [myUserId, setMyUserId] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modal de Nova Tarefa Rápida no Kanban
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newStatus, setNewStatus] = useState<TaskStatus>('open');
  const [newDueAt, setNewDueAt] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newCaseId, setNewCaseId] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal de Delegação Rápida no Kanban
  const [delegateTaskTarget, setDelegateTaskTarget] = useState<TaskRow | null>(null);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [delegatingSaving, setDelegatingSaving] = useState(false);

  // Modal de Motivo de Pausa / Cancelamento (substitui window.prompt)
  const [reasonModal, setReasonModal] = useState<{
    task: TaskRow;
    targetStatus: 'paused' | 'cancelled';
    reason: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

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
      setMyUserId(user.id);

      const r = await getMyOfficeRole().catch(() => '');
      setRole(r);

      const [{ data, error: qErr }, clientsLite, casesLite, { data: ps }] = await Promise.all([
        sb
          .from('tasks')
          .select(
            'id,title,description,priority,status_v2,due_at,assigned_to_user_id,client_id,case_id,paused_at,pause_reason,cancelled_at,cancel_reason,done_at,created_at,updated_at,subtasks',
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
  }, []);

  const filteredRows = useMemo(() => {
    let out = rows;

    if (assigneeFilter !== 'all') {
      out = out.filter((r) => (r.assigned_to_user_id || '') === assigneeFilter);
    }

    if (priorityFilter !== 'all') {
      out = out.filter((r) => (r.priority || '').toLowerCase() === priorityFilter);
    }

    if (onlyMine && myUserId) {
      out = out.filter((r) => (r.assigned_to_user_id || '') === myUserId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      out = out.filter((r) => {
        const clientName = r.client_id ? clientsMap.get(r.client_id)?.name || '' : '';
        const caseTitle = r.case_id ? casesMap.get(r.case_id)?.title || '' : '';
        return `${r.title} ${clientName} ${caseTitle}`.toLowerCase().includes(q);
      });
    }

    return out;
  }, [rows, assigneeFilter, priorityFilter, onlyMine, myUserId, searchQuery, clientsMap, casesMap]);

  const boardStats = useMemo(() => {
    const openish = filteredRows.filter((r) => r.status_v2 !== 'done' && r.status_v2 !== 'cancelled');
    let overdue = 0;
    let due48 = 0;
    let noDue = 0;
    let slaAtRisk = 0;
    let slaViolated = 0;

    for (const t of openish) {
      if (!t.due_at) {
        noDue += 1;
        continue;
      }
      const due = new Date(t.due_at).getTime();
      const diffH = (due - Date.now()) / 36e5;
      if (diffH < 0) overdue += 1;
      else if (diffH <= 48) due48 += 1;

      const s = slaBadge(t as any);
      if (s?.label === 'SLA em risco') slaAtRisk += 1;
      if (s?.label === 'SLA violado') slaViolated += 1;
    }

    return {
      total: filteredRows.length,
      openish: openish.length,
      overdue,
      due48,
      noDue,
      slaAtRisk,
      slaViolated,
    };
  }, [filteredRows]);

  const visibleColumns = useMemo(
    () => (hideCancelled ? COLUMNS.filter((c) => c.id !== 'cancelled') : COLUMNS),
    [hideCancelled],
  );

  const byStatus = useMemo(() => {
    const map = new Map<TaskStatus, TaskRow[]>();
    for (const c of COLUMNS) map.set(c.id, []);
    for (const r of filteredRows) {
      const k = (r.status_v2 || 'open') as TaskStatus;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
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
  }, [filteredRows]);

  async function applyStatusUpdate(task: TaskRow, next: TaskStatus, customReason?: string) {
    if (busyId) return;

    const patch: any = { status_v2: next, updated_at: new Date().toISOString() };
    const nowIso = new Date().toISOString();

    if (next === 'open' || next === 'in_progress') {
      patch.paused_at = null;
      patch.pause_reason = null;
      patch.cancelled_at = null;
      patch.cancel_reason = null;
      patch.done_at = null;
    } else if (next === 'paused') {
      patch.paused_at = nowIso;
      patch.pause_reason = (customReason ?? task.pause_reason ?? '').trim() || null;
    } else if (next === 'done') {
      patch.done_at = nowIso;
      patch.paused_at = null;
      patch.pause_reason = null;
    } else if (next === 'cancelled') {
      patch.cancelled_at = nowIso;
      patch.cancel_reason = (customReason ?? task.cancel_reason ?? '').trim() || null;
    }

    setBusyId(task.id);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { error: uErr } = await sb.from('tasks').update(patch).eq('id', task.id);
      if (uErr) throw new Error(uErr.message);

      setRows((prev) => prev.map((t) => (t.id === task.id ? ({ ...t, ...patch } as TaskRow) : t)));
      setBusyId(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao atualizar tarefa.');
      setBusyId(null);
    }
  }

  function requestStatusChange(task: TaskRow, next: TaskStatus) {
    if (next === 'paused' || next === 'cancelled') {
      setReasonModal({
        task,
        targetStatus: next,
        reason: next === 'paused' ? task.pause_reason || '' : task.cancel_reason || '',
      });
      return;
    }
    void applyStatusUpdate(task, next);
  }

  async function handleCreateQuickTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();
      const dueIso = newDueAt ? new Date(newDueAt).toISOString() : null;
      const nowIso = new Date().toISOString();

      const payload: any = {
        user_id: user.id,
        created_by_user_id: user.id,
        assigned_to_user_id: newAssignee || user.id,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        priority: newPriority,
        status_v2: newStatus,
        due_at: dueIso,
        client_id: newClientId || null,
        case_id: newCaseId || null,
        done_at: newStatus === 'done' ? nowIso : null,
      };

      const { data: created, error: insErr } = await sb
        .from('tasks')
        .insert(payload)
        .select(
          'id,title,description,priority,status_v2,due_at,assigned_to_user_id,client_id,case_id,paused_at,pause_reason,cancelled_at,cancel_reason,done_at,created_at,updated_at,subtasks',
        )
        .single();

      if (insErr) throw new Error(insErr.message);

      setRows((prev) => [created as TaskRow, ...prev]);
      setCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('medium');
      setNewDueAt('');
      setNewClientId('');
      setNewCaseId('');
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar tarefa no Kanban.');
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelegate(e: React.FormEvent) {
    e.preventDefault();
    if (!delegateTaskTarget || !delegateUserId) return;
    setDelegatingSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { error: rpcErr } = await sb.rpc('delegate_task', {
        p_task_id: delegateTaskTarget.id,
        p_assigned_to_user_id: delegateUserId,
      });

      if (rpcErr) {
        const { error: upErr } = await sb
          .from('tasks')
          .update({ assigned_to_user_id: delegateUserId, last_assigned_at: new Date().toISOString() } as any)
          .eq('id', delegateTaskTarget.id);
        if (upErr) throw new Error(upErr.message);
      }

      setRows((prev) =>
        prev.map((t) => (t.id === delegateTaskTarget.id ? { ...t, assigned_to_user_id: delegateUserId } : t)),
      );
      setDelegateTaskTarget(null);
      setDelegateUserId('');
    } catch (err: any) {
      setError(err?.message || 'Falha ao delegar tarefa.');
    } finally {
      setDelegatingSaving(false);
    }
  }

  const activeTask = useMemo(() => (activeId ? rows.find((r) => r.id === activeId) || null : null), [activeId, rows]);

  function findContainer(id: string): TaskStatus | null {
    const col = COLUMNS.find((c) => c.id === id);
    if (col) return col.id;
    const task = rows.find((r) => r.id === id);
    if (task) return task.status_v2 as TaskStatus;
    return null;
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    const task = rows.find((r) => r.id === activeTaskId);
    if (!task) return;

    const from: TaskStatus = task.status_v2 as TaskStatus;
    const to = findContainer(overId);

    if (!to || from === to) return;

    if (busyId && busyId !== activeTaskId) {
      setBusyId(null);
    }

    requestStatusChange(task, to);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KanbanSquare}
        eyebrow="Operação"
        title="Quadro Kanban de Tarefas"
        subtitle="Arraste os cartões entre colunas, controle SLAs, delegue responsáveis e crie tarefas rápidas."
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setNewStatus('open');
                setNewAssignee(myUserId);
                setCreateOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nova Tarefa
            </button>
            <Link to="/app/tarefas" className="btn-ghost">
              <ListChecks className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
              Visão em Lista
            </Link>
            <button onClick={() => void load()} className="btn-ghost" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Atualizar
            </button>
          </>
        }
      />

      {/* KPIs do Quadro */}
      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[11px] text-white/60">Total no quadro</div>
          <div className="text-xl font-semibold text-white">{boardStats.total}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[11px] text-white/60">Em aberto</div>
          <div className="text-xl font-semibold text-white">{boardStats.openish}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[11px] text-white/60">Atrasadas</div>
          <div className="text-xl font-semibold text-red-200">{boardStats.overdue}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[11px] text-white/60">Críticas (48h)</div>
          <div className="text-xl font-semibold text-amber-200">{boardStats.due48}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-[11px] text-white/60">Sem prazo</div>
          <div className="text-xl font-semibold text-white">{boardStats.noDue}</div>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <div className="text-[11px] text-red-100/80">SLA violado</div>
          <div className="text-xl font-semibold text-red-200">{boardStats.slaViolated}</div>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <div className="text-[11px] text-amber-100/80">SLA em risco</div>
          <div className="text-xl font-semibold text-amber-200">{boardStats.slaAtRisk}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] text-white/60">Prioridade</div>
          <select
            className="select !mt-1 !w-full !py-1.5 !text-xs"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      {/* Filtros do Quadro */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] text-white/60">Filtrar por responsável</div>
          <select className="select !mt-1 !w-full" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="all">Todos os membros</option>
            {profiles.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {profileLabel(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="text-[11px] text-white/60">Buscar por tarefa, cliente ou processo</div>
          <div className="relative mt-1">
            <Search className="h-4 w-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input !mt-0 pl-9"
              placeholder="Ex.: petição, nome do cliente, processo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col justify-center gap-2">
          <div className="text-[11px] text-white/60">Visão Rápida</div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-white/85 cursor-pointer">
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
              Somente minhas tarefas
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-white/75 cursor-pointer">
              <input type="checkbox" checked={hideCancelled} onChange={(e) => setHideCancelled(e.target.checked)} />
              Ocultar Canceladas
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      {/* Colunas Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <div className={`grid gap-4 ${hideCancelled ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}>
          {visibleColumns.map((col) => {
            const list = byStatus.get(col.id) || [];
            const ids = list.map((t) => t.id);

            return (
              <KanbanColumn key={col.id} id={col.id}>
                <Card className={`min-h-[420px] flex flex-col ${col.accent}`}>
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                      <span className="text-sm font-semibold text-white">{col.label}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/80">
                        {list.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewStatus(col.id);
                        setNewAssignee(myUserId);
                        setCreateOpen(true);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/60 hover:bg-white/10 hover:text-white"
                      title={`Adicionar tarefa em "${col.label}"`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="mt-3 flex-1 space-y-2.5">
                      {loading ? <div className="text-sm text-white/60">Carregando…</div> : null}

                      {!loading && !list.length ? (
                        <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-xs text-white/40">
                          Arraste tarefas para cá
                        </div>
                      ) : null}

                      {list.map((t) => {
                        const due = dueBadge(t);
                        const sla = slaBadge(t);
                        const stale = staleBadge(t);
                        const prio = priorityMeta(t.priority);
                        const assignee = t.assigned_to_user_id ? profileMap.get(t.assigned_to_user_id) : null;
                        const client = t.client_id ? clientsMap.get(t.client_id) : null;
                        const kase = t.case_id ? casesMap.get(t.case_id) : null;
                        const subtasksList = Array.isArray(t.subtasks) ? t.subtasks : [];
                        const doneSubtasks = subtasksList.filter((st) => st.is_done || st.done).length;

                        return (
                          <KanbanCard key={t.id} id={t.id} disabled={busyId === t.id}>
                            <div
                              className={`rounded-2xl border border-white/10 bg-neutral-900/80 p-3.5 shadow-sm transition hover:border-white/25 ${prio.borderLeft}`}
                            >
                              {/* Topo: Prioridade + Alertas de Prazo */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${prio.cls}`}>
                                  {prio.label}
                                </span>
                                <div className="flex flex-wrap items-center gap-1">
                                  {due ? <span className={due.cls}>{due.label}</span> : null}
                                  {sla ? <span className={sla.cls}>{sla.label}</span> : null}
                                  {stale ? <span className={stale.cls}>{stale.label}</span> : null}
                                </div>
                              </div>

                              {/* Título da Tarefa */}
                              <Link
                                to={`/app/tarefas/${t.id}`}
                                className="block text-sm font-semibold text-white hover:text-amber-300 leading-snug"
                              >
                                {t.title}
                              </Link>

                              {/* Motivo de Pausa / Cancelamento quando houver */}
                              {t.status_v2 === 'paused' && t.pause_reason ? (
                                <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                                  <strong>Pausa:</strong> {t.pause_reason}
                                </div>
                              ) : null}

                              {t.status_v2 === 'cancelled' && t.cancel_reason ? (
                                <div className="mt-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-2.5 py-1.5 text-[11px] text-rose-200">
                                  <strong>Cancelada:</strong> {t.cancel_reason}
                                </div>
                              ) : null}

                              {/* Barra de Progresso de Subtarefas */}
                              {subtasksList.length > 0 ? (
                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between text-[10px] text-white/60 mb-1">
                                    <span className="inline-flex items-center gap-1">
                                      <ListChecks className="h-3 w-3 text-amber-300" />
                                      Subtarefas
                                    </span>
                                    <span>
                                      {doneSubtasks}/{subtasksList.length}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-emerald-400 transition-all"
                                      style={{ width: `${Math.round((doneSubtasks / subtasksList.length) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : null}

                              {/* Metadados: Responsável, Cliente, Caso, Prazo */}
                              <div className="mt-2.5 space-y-1 text-xs text-white/65 border-t border-white/5 pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1 text-white/80 font-medium">
                                    <UserCheck className="h-3.5 w-3.5 text-amber-300" />
                                    {assignee
                                      ? profileLabel(assignee)
                                      : t.assigned_to_user_id
                                        ? t.assigned_to_user_id.slice(0, 8)
                                        : 'Não atribuído'}
                                  </span>
                                  {t.due_at ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-white/50">
                                      <Clock className="h-3 w-3" />
                                      {fmtDT(t.due_at)}
                                    </span>
                                  ) : null}
                                </div>

                                {client ? (
                                  <div className="truncate">
                                    <span className="text-white/45">Cliente: </span>
                                    <Link to={`/app/clientes/${client.id}`} className="text-amber-200/90 hover:underline">
                                      {client.name}
                                    </Link>
                                  </div>
                                ) : null}

                                {kase ? (
                                  <div className="truncate flex items-center gap-1">
                                    <Briefcase className="h-3 w-3 text-white/40 shrink-0" />
                                    <Link to={`/app/casos/${kase.id}`} className="text-sky-200/90 hover:underline truncate">
                                      {kase.title}
                                    </Link>
                                  </div>
                                ) : null}
                              </div>

                              {/* Botões de Ação Rápida no Card */}
                              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2.5">
                                {t.status_v2 !== 'in_progress' && t.status_v2 !== 'done' ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-400/20"
                                    disabled={busyId === t.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      requestStatusChange(t, 'in_progress');
                                    }}
                                  >
                                    <Play className="h-3 w-3" />
                                    Iniciar
                                  </button>
                                ) : null}

                                {t.status_v2 !== 'paused' && t.status_v2 !== 'done' ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/75 hover:bg-white/10"
                                    disabled={busyId === t.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      requestStatusChange(t, 'paused');
                                    }}
                                  >
                                    <PauseCircle className="h-3 w-3" />
                                    Pausar
                                  </button>
                                ) : null}

                                {t.status_v2 !== 'done' ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/20"
                                    disabled={busyId === t.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      requestStatusChange(t, 'done');
                                    }}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Concluir
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-400/20"
                                  disabled={busyId === t.id}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDelegateTaskTarget(t);
                                    setDelegateUserId(t.assigned_to_user_id || profiles[0]?.user_id || '');
                                  }}
                                  title="Delegar ou alterar responsável"
                                >
                                  <UserPlus className="h-3 w-3" />
                                  Delegar
                                </button>

                                {isAdmin && t.status_v2 !== 'cancelled' ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20 ml-auto"
                                    disabled={busyId === t.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      requestStatusChange(t, 'cancelled');
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </KanbanCard>
                        );
                      })}
                    </div>
                  </SortableContext>
                </Card>
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rounded-2xl border border-amber-400/40 bg-neutral-950/95 p-3.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${priorityMeta(activeTask.priority).cls}`}>
                  {priorityMeta(activeTask.priority).label}
                </span>
                <span className="text-[11px] text-amber-300">Movendo cartão…</span>
              </div>
              <div className="text-sm font-semibold text-white">{activeTask.title}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal: Nova Tarefa Rápida no Kanban */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Nova Tarefa Rápida no Kanban</h3>
              <button onClick={() => setCreateOpen(false)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTask} className="space-y-3">
              <label className="block text-xs text-white/80">
                Título da Tarefa *
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Protocolar contestação com documentos"
                  className="input mt-1"
                  autoFocus
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-white/80">
                  Coluna Inicial
                  <select className="select mt-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)}>
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-white/80">
                  Prioridade
                  <select className="select mt-1" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                    <option value="high">Alta (SLA 24h)</option>
                    <option value="medium">Média (SLA 48h)</option>
                    <option value="low">Baixa (SLA 72h)</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-white/80">
                  Responsável
                  <select className="select mt-1" value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}>
                    <option value="">Eu mesmo</option>
                    {profiles.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {profileLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-white/80">
                  Prazo Fatal (Opcional)
                  <input
                    type="datetime-local"
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                    className="input mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs text-white/80">
                  Cliente Vinculado (Opcional)
                  <select className="select mt-1" value={newClientId} onChange={(e) => setNewClientId(e.target.value)}>
                    <option value="">Nenhum</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-white/80">
                  Processo Vinculado (Opcional)
                  <select className="select mt-1" value={newCaseId} onChange={(e) => setNewCaseId(e.target.value)}>
                    <option value="">Nenhum</option>
                    {cases
                      .filter((c) => !newClientId || c.client_id === newClientId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs text-white/80">
                Instruções / Observações
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detalhes ou orientações para execução..."
                  className="input mt-1 min-h-[70px]"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn-ghost !text-xs">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !newTitle.trim()} className="btn-primary !text-xs">
                  {creating ? 'Criando…' : 'Criar no Kanban'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal: Delegar Tarefa Direto no Kanban */}
      {delegateTaskTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => !delegatingSaving && setDelegateTaskTarget(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-neutral-950 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Delegar Responsável</h3>
              </div>
              <button onClick={() => setDelegateTaskTarget(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-white/70">
              Tarefa: <strong className="text-white">{delegateTaskTarget.title}</strong>
            </div>

            <form onSubmit={handleConfirmDelegate} className="space-y-4">
              <label className="block text-xs text-white/80">
                Selecione o novo responsável da equipe:
                <select
                  className="select mt-1.5"
                  value={delegateUserId}
                  onChange={(e) => setDelegateUserId(e.target.value)}
                  required
                >
                  <option value="">Selecione um membro…</option>
                  {profiles.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {profileLabel(p)} {p.email ? `(${p.email})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDelegateTaskTarget(null)} className="btn-ghost !text-xs">
                  Cancelar
                </button>
                <button type="submit" disabled={delegatingSaving || !delegateUserId} className="btn-primary !text-xs">
                  {delegatingSaving ? 'Delegando…' : 'Confirmar Delegação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Modal: Motivo de Pausa ou Cancelamento */}
      {reasonModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setReasonModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {reasonModal.targetStatus === 'paused' ? 'Pausar Tarefa' : 'Cancelar Tarefa'}
                </h3>
              </div>
              <button onClick={() => setReasonModal(null)} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-white/70">
              Tarefa: <strong className="text-white">{reasonModal.task.title}</strong>
            </div>

            <label className="block text-xs text-white/80">
              {reasonModal.targetStatus === 'paused'
                ? 'Motivo da pausa / bloqueio (ex.: aguardando documento do cliente):'
                : 'Motivo do cancelamento:'}
              <textarea
                value={reasonModal.reason}
                onChange={(e) => setReasonModal({ ...reasonModal, reason: e.target.value })}
                placeholder="Opcional, mas recomendado para visibilidade da equipe..."
                className="input mt-1.5 min-h-[80px]"
                autoFocus
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReasonModal(null)} className="btn-ghost !text-xs">
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  const { task, targetStatus, reason } = reasonModal;
                  setReasonModal(null);
                  void applyStatusUpdate(task, targetStatus, reason);
                }}
                className="btn-primary !text-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
