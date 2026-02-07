import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'done' | string;
  priority: 'low' | 'medium' | 'high' | string;
  due_date: string | null;
  done_at: string | null;
  created_at: string;
};

function isOverdue(due: string | null) {
  if (!due) return false;
  const today = new Date();
  const d = new Date(due + 'T00:00:00');
  // compare date-only
  return d.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function isToday(due: string | null) {
  if (!due) return false;
  const today = new Date();
  const d = new Date(due + 'T00:00:00');
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function TasksPage() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);

  const openTasks = useMemo(() => rows.filter((r) => r.status !== 'done'), [rows]);
  const doneTasks = useMemo(() => rows.filter((r) => r.status === 'done'), [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: qErr } = await sb
        .from('tasks')
        .select('id,title,description,status,priority,due_date,done_at,created_at')
        .order('created_at', { ascending: false });

      if (qErr) throw new Error(qErr.message);
      setRows((data || []) as TaskRow[]);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar tarefas.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const { error: iErr } = await sb.from('tasks').insert({
        user_id: user.id,
        title: title.trim(),
        priority,
        due_date: dueDate ? dueDate : null,
      });

      if (iErr) throw new Error(iErr.message);
      setCreateOpen(false);
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar tarefa.');
      setSaving(false);
    }
  }

  async function toggleDone(t: TaskRow) {
    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const nextDone = t.status !== 'done';
      const { error: uErr } = await sb
        .from('tasks')
        .update({ status: nextDone ? 'done' : 'open', done_at: nextDone ? new Date().toISOString() : null })
        .eq('id', t.id);

      if (uErr) throw new Error(uErr.message);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar tarefa.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tarefas</h1>
          <p className="text-sm text-white/60">Suas tarefas (Supabase).</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white/90"
        >
          Nova tarefa
        </button>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Nova tarefa</div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="md:col-span-2 text-sm text-white/80">
                Título
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="text-sm text-white/80">
                Prioridade
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </label>
              <label className="text-sm text-white/80">
                Vencimento
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                disabled={saving}
                onClick={onCreate}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white/90 disabled:opacity-60"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                disabled={saving}
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>

            {error ? <div className="text-sm text-red-200">{error}</div> : null}
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Em aberto</div>
          <div className="mt-4 grid gap-2">
            {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
            {!loading && openTasks.length === 0 ? (
              <div className="text-sm text-white/60">Nenhuma tarefa em aberto.</div>
            ) : null}
            {openTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => void toggleDone(t)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
              >
                <div>
                  <div className="text-sm font-semibold text-white">{t.title}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {t.due_date ? (
                      <span
                        className={
                          isOverdue(t.due_date)
                            ? 'text-red-200'
                            : isToday(t.due_date)
                              ? 'text-amber-200'
                              : 'text-white/60'
                        }
                      >
                        Vence em: {t.due_date}
                      </span>
                    ) : (
                      'Sem vencimento'
                    )}
                    {' · '}Prioridade: {t.priority}
                  </div>
                </div>
                <div className="mt-0.5 text-xs font-semibold text-white/70">Concluir</div>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Concluídas</div>
          <div className="mt-4 grid gap-2">
            {loading ? null : null}
            {!loading && doneTasks.length === 0 ? (
              <div className="text-sm text-white/60">Nenhuma tarefa concluída ainda.</div>
            ) : null}
            {doneTasks.slice(0, 10).map((t) => (
              <button
                key={t.id}
                onClick={() => void toggleDone(t)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left opacity-80 hover:bg-white/10"
              >
                <div>
                  <div className="text-sm font-semibold text-white line-through">{t.title}</div>
                  <div className="mt-1 text-xs text-white/50">Clique para reabrir</div>
                </div>
                <div className="mt-0.5 text-xs font-semibold text-white/60">Reabrir</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {error && !createOpen ? <div className="text-sm text-red-200">{error}</div> : null}
    </div>
  );
}
