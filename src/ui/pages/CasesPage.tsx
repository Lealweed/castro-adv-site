import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type CaseRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_id: string | null;
};

export function CasesPage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState('aberto');
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: qErr } = await sb
        .from('cases')
        .select('id,title,status,created_at,client_id')
        .order('created_at', { ascending: false });

      if (qErr) throw new Error(qErr.message);
      setRows((data || []) as CaseRow[]);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar casos.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!newTitle.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const { error: iErr } = await sb.from('cases').insert({
        user_id: user.id,
        title: newTitle.trim(),
        status: newStatus.trim() || 'aberto',
      });

      if (iErr) throw new Error(iErr.message);

      setCreateOpen(false);
      setNewTitle('');
      setNewStatus('aberto');
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar caso.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Casos</h1>
          <p className="text-sm text-white/60">Base real (Supabase).</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white/90"
        >
          Novo caso
        </button>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Novo caso</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-white/80">
                Título
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </label>
              <label className="text-sm text-white/80">
                Status
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-white/50">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {ordered.map((c) => (
                  <tr key={c.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium text-white">{c.title}</td>
                    <td className="px-4 py-3 text-white/70">{c.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
                        to={`/app/casos/${c.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}

                {ordered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-white/60" colSpan={3}>
                      Nenhum caso cadastrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
