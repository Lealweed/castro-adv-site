import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: qErr } = await sb
        .from('clients')
        .select('id,name,phone,email,created_at')
        .order('created_at', { ascending: false });

      if (qErr) throw new Error(qErr.message);
      setRows((data || []) as ClientRow[]);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar clientes.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const { error: iErr } = await sb.from('clients').insert({
        user_id: user.id,
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
      });

      if (iErr) throw new Error(iErr.message);

      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setSaving(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar cliente.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-sm text-white/60">Base real (Supabase).</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          Novo cliente
        </button>
      </div>

      {createOpen ? (
        <Card>
          <div className="grid gap-4">
            <div className="text-sm font-semibold text-white">Novo cliente</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm text-white/80">
                Nome
                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                E-mail
                <input className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                Telefone
                <input className="input" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
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
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((c) => (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                      <td className="px-4 py-3 text-white/70">
                        <div className="grid gap-0.5">
                          <div>{c.phone || '—'}</div>
                          <div className="text-xs text-white/50">{c.email || '—'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link className="btn-ghost !rounded-lg !px-3 !py-1.5 !text-xs" to={`/app/clientes/${c.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {ordered.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm text-white/60" colSpan={3}>
                        Nenhum cliente cadastrado.
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
                  to={`/app/clientes/${c.id}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
                >
                  <div className="text-sm font-semibold text-white">{c.name}</div>
                  <div className="mt-2 text-xs text-white/60">
                    <div>{c.phone || '—'}</div>
                    <div className="mt-0.5 text-white/50">{c.email || '—'}</div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-200">
                    Abrir →
                  </div>
                </Link>
              ))}

              {ordered.length === 0 ? <div className="text-sm text-white/60">Nenhum cliente cadastrado.</div> : null}
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
}
