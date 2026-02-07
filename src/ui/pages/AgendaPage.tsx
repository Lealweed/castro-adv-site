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

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AgendaPage() {
  const [rows, setRows] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const upcoming = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      // For MVP: just load last 50 items; later we add proper date-range filters.
      const { data, error: qErr } = await sb
        .from('agenda_items')
        .select('id,kind,title,notes,location,all_day,starts_at,ends_at,due_date,status,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

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
  }, []);

  async function onCreate() {
    if (!title.trim()) return;

    // Basic validations
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agenda</h1>
          <p className="text-sm text-white/60">Compromissos e prazos (Supabase).</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white/90"
        >
          Novo
        </button>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Novo item</div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm text-white/80">
                Tipo
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as any)}
                >
                  <option value="commitment">Compromisso</option>
                  <option value="deadline">Prazo</option>
                </select>
              </label>
              <label className="md:col-span-2 text-sm text-white/80">
                Título
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>

            {kind === 'commitment' ? (
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm text-white/80">
                  Início
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <label className="text-sm text-white/80">
                  Fim
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
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
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-white/80">
                Local
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>
              <label className="text-sm text-white/80">
                Observações
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
        {error && !createOpen ? <div className="text-sm text-red-200">{error}</div> : null}

        {!loading && !error ? (
          <div className="grid gap-2">
            {upcoming.map((it) => (
              <div key={it.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {it.title}{' '}
                      <span className="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                        {it.kind === 'deadline' ? 'Prazo' : 'Compromisso'}
                      </span>
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

            {upcoming.length === 0 ? (
              <div className="text-sm text-white/60">Nada na agenda ainda.</div>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
