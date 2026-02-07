import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';

type Contact = {
  id: string;
  name: string;
  kind: 'PERSON' | 'COMPANY';
  email?: string | null;
  phone?: string | null;
  createdAt?: string;
};

export function ClientsPage() {
  const [rows, setRows] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<'PERSON' | 'COMPANY'>('PERSON');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await apiFetch('/contacts', { method: 'GET' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError((json as any)?.message || (json as any)?.error || 'Falha ao carregar clientes.');
      setLoading(false);
      return;
    }

    setRows(((json as any) ?? []) as Contact[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);

    const res = await apiFetch('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        name: newName.trim(),
        kind: newKind,
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
      }),
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok) {
      setError(json?.message || json?.error || 'Falha ao criar cliente.');
      setSaving(false);
      return;
    }

    setCreateOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewKind('PERSON');
    setSaving(false);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-sm text-white/60">Lista conectada na API.</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-white/90"
        >
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
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label className="text-sm text-white/80">
                Tipo
                <select
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as any)}
                >
                  <option value="PERSON">Pessoa</option>
                  <option value="COMPANY">Empresa</option>
                </select>
              </label>
              <label className="text-sm text-white/80">
                E-mail
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </label>
              <label className="text-sm text-white/80">
                Telefone
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
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
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {ordered.map((c) => (
                  <tr key={c.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-4 py-3 text-white/70">{c.kind === 'PERSON' ? 'Pessoa' : 'Empresa'}</td>
                    <td className="px-4 py-3 text-white/70">
                      <div className="grid gap-0.5">
                        <div>{c.phone || '—'}</div>
                        <div className="text-xs text-white/50">{c.email || '—'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
                        to={`/app/clientes/${c.id}`}
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}

                {ordered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-white/60" colSpan={4}>
                      Nenhum cliente cadastrado.
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
