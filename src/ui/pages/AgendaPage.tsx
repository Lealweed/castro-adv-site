import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type AgendaItem = {
  id: string;
  kind: 'commitment' | 'deadline' | string;
  title: string;
  notes: string | null;
  location: string | null;
  all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  due_date: string | null;
  status: 'confirmed' | 'cancelled' | 'done' | string;
  created_at: string;
};

type ViewMode = 'today' | 'week' | 'month';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function startOfWeek(d: Date) {
  // Monday-based week
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  return startOfDay(x);
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtMonthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function AgendaPage() {
  const [rows, setRows] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<ViewMode>('today');
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [kind, setKind] = useState<'commitment' | 'deadline'>('commitment');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => {
    const now = new Date();

    if (view === 'today') {
      return { start: startOfDay(now), end: endOfDay(now), label: 'Hoje' };
    }

    if (view === 'week') {
      const s = startOfWeek(now);
      const e = endOfDay(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6));
      return { start: s, end: e, label: 'Semana' };
    }

    // month
    const s = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const e = endOfDay(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0));
    return { start: s, end: e, label: 'Mês' };
  }, [view, monthCursor]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const startDate = toDateStr(range.start);
      const endDate = toDateStr(range.end);
      const startIso = range.start.toISOString();
      const endIso = range.end.toISOString();

      const orFilter = [
        `and(kind.eq.deadline,due_date.gte.${startDate},due_date.lte.${endDate})`,
        `and(kind.eq.commitment,starts_at.gte.${startIso},starts_at.lte.${endIso})`,
      ].join(',');

      const { data, error: qErr } = await sb
        .from('agenda_items')
        .select('id,kind,title,notes,location,all_day,starts_at,ends_at,due_date,status,created_at')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(500);

      if (qErr) throw new Error(qErr.message);
      setRows((data || []) as AgendaItem[]);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar agenda.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, monthCursor.getTime()]);

  async function onCreate() {
    if (!title.trim()) return;

    if (kind === 'commitment') {
      if (!startsAt) {
        setError('Informe o início do compromisso.');
        return;
      }
      if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
        setError('O fim não pode ser antes do início.');
        return;
      }
    }

    if (kind === 'deadline' && !dueDate) {
      setError('Informe a data do prazo.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const payload: any = {
        user_id: user.id,
        kind,
        title: title.trim(),
        notes: notes.trim() || null,
        location: location.trim() || null,
        all_day: allDay,
        status: 'confirmed',
      };

      if (kind === 'commitment') {
        payload.starts_at = startsAt ? new Date(startsAt).toISOString() : null;
        payload.ends_at = endsAt ? new Date(endsAt).toISOString() : null;
        payload.due_date = null;
      } else {
        payload.due_date = dueDate;
        payload.starts_at = null;
        payload.ends_at = null;
      }

      const { error: iErr } = await sb.from('agenda_items').insert(payload);
      if (iErr) throw new Error(iErr.message);

      setCreateOpen(false);
      setKind('commitment');
      setTitle('');
      setNotes('');
      setLocation('');
      setAllDay(false);
      setStartsAt('');
      setEndsAt('');
      setDueDate('');
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar item na agenda.');
      setSaving(false);
    }
  }

  const itemsSorted = useMemo(() => {
    const score = (it: AgendaItem) => {
      if (it.kind === 'deadline') return it.due_date ? new Date(it.due_date + 'T00:00:00').getTime() : 0;
      return it.starts_at ? new Date(it.starts_at).getTime() : 0;
    };

    return [...rows].sort((a, b) => score(a) - score(b));
  }, [rows]);

  const monthGrid = useMemo(() => {
    if (view !== 'month') return null;

    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const first = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0).getDate();

    const firstDow = (first.getDay() + 6) % 7; // Monday=0..Sunday=6

    const map = new Map<string, AgendaItem[]>();
    for (const it of rows) {
      const key =
        it.kind === 'deadline'
          ? it.due_date
          : it.starts_at
            ? toDateStr(new Date(it.starts_at))
            : null;
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }

    const cells: Array<{ day: number | null; key: string | null; count: number; hasDeadline: boolean }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ day: null, key: null, count: 0, hasDeadline: false });
    for (let day = 1; day <= lastDay; day++) {
      const key = `${y}-${pad2(m + 1)}-${pad2(day)}`;
      const list = map.get(key) || [];
      cells.push({
        day,
        key,
        count: list.length,
        hasDeadline: list.some((x) => x.kind === 'deadline'),
      });
    }

    return { cells };
  }, [view, monthCursor, rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agenda</h1>
          <p className="text-sm text-white/60">Hoje · Semana · Mês</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(
              [
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Semana' },
                { id: 'month', label: 'Mês' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ' +
                  (view === t.id ? 'bg-white text-neutral-950' : 'text-white/70 hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {view === 'month' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
                className="btn-ghost"
              >
                ‹
              </button>
              <div className="min-w-[180px] text-center text-sm font-semibold text-white">
                {fmtMonthLabel(monthCursor)}
              </div>
              <button
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
                className="btn-ghost"
              >
                ›
              </button>
            </div>
          ) : null}

          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            Novo
          </button>
        </div>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Novo item</div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-white/80">
                Tipo
                <select className="select" value={kind} onChange={(e) => setKind(e.target.value as any)}>
                  <option value="commitment">Compromisso</option>
                  <option value="deadline">Prazo</option>
                </select>
              </label>
              <label className="md:col-span-2 text-sm text-white/80">
                Título
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
            </div>

            {kind === 'commitment' ? (
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-white/80">
                  Início
                  <input
                    type="datetime-local"
                    className="input"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <label className="text-sm text-white/80">
                  Fim
                  <input
                    type="datetime-local"
                    className="input"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-white/80 md:mt-7">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Dia inteiro
                </label>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-white/80">
                  Data do prazo
                  <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </label>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-white/80">
                Local
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                Observações
                <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button disabled={saving} onClick={onCreate} className="btn-primary">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button disabled={saving} onClick={() => setCreateOpen(false)} className="btn-ghost">
                Cancelar
              </button>
            </div>

            {error ? <div className="text-sm text-red-200">{error}</div> : null}
          </div>
        </Card>
      ) : null}

      {view === 'month' && monthGrid ? (
        <Card>
          <div className="grid grid-cols-7 gap-2 text-xs text-white/60">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
              <div key={d} className="px-2 py-1 text-center font-semibold text-white/70">
                {d}
              </div>
            ))}

            {monthGrid.cells.map((c, idx) => (
              <div
                key={c.key || `empty-${idx}`}
                className={
                  'min-h-[64px] rounded-xl border border-white/10 bg-white/5 p-2 ' +
                  (c.day ? 'text-white' : 'opacity-30')
                }
              >
                {c.day ? (
                  <div className="flex items-start justify-between">
                    <div className="text-xs font-semibold text-white/80">{c.day}</div>
                    {c.count ? (
                      <div
                        className={
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                          (c.hasDeadline ? 'bg-amber-300/15 text-amber-200' : 'bg-white/10 text-white/70')
                        }
                      >
                        {c.count}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-white/50">
            Dica: o número no canto indica quantos itens existem no dia (prazos ficam em destaque dourado).
          </div>
        </Card>
      ) : null}

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
        {error && !createOpen ? <div className="text-sm text-red-200">{error}</div> : null}

        {!loading && !error ? (
          <div className="grid gap-2">
            {itemsSorted.map((it) => (
              <div key={it.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {it.title} <span className="badge">{it.kind === 'deadline' ? 'Prazo' : 'Compromisso'}</span>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {it.kind === 'deadline'
                        ? `Data: ${it.due_date || '—'}`
                        : `Início: ${fmtDateTime(it.starts_at)}${it.ends_at ? ` · Fim: ${fmtDateTime(it.ends_at)}` : ''}`}
                    </div>
                    {it.location ? <div className="mt-1 text-xs text-white/50">Local: {it.location}</div> : null}
                    {it.notes ? <div className="mt-1 text-xs text-white/50">Obs: {it.notes}</div> : null}
                  </div>
                  <div className="text-xs font-semibold text-white/60">{it.status}</div>
                </div>
              </div>
            ))}

            {itemsSorted.length === 0 ? <div className="text-sm text-white/60">Nada nesse período.</div> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
