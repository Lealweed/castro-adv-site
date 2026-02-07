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

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('abert')) return 'badge badge-gold';
  if (s.includes('and')) return 'badge';
  if (s.includes('encerr') || s.includes('final')) return 'badge';
  return 'badge';
}

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
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
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
                <input className="input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                Status
                <input className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
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

      <Card>
        {loading ? <div className="text-sm text-white/70">Carregando…</div> : null}
        {error && !createOpen ? <div className="text-sm text-red-200">{error}</div> : null}

        {!loading && !error ? (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
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
                      <td className="px-4 py-3">
                        <span className={statusBadge(c.status)}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs" to={`/app/casos/${c.id}`}>
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

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {ordered.map((c) => (
                <Link
                  key={c.id}
                  to={`/app/casos/${c.id}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{c.title}</div>
                    <span className={statusBadge(c.status)}>{c.status}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-200">
                    Abrir →
                  </div>
                </Link>
              ))}

              {ordered.length === 0 ? <div className="text-sm text-white/60">Nenhum caso cadastrado.</div> : null}
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
