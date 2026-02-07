import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';

type CaseRow = {
  id: string;
  title: string;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED';
  description?: string | null;
  clientId?: string | null;
  createdAt?: string;
};

export function CasesPage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<CaseRow['status']>('OPEN');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const ordered = useMemo(() => rows, [rows]);

  async function load() {
    setLoading(true);
    setError(null);

    const res = await apiFetch('/cases', { method: 'GET' });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setError((json as any)?.message || (json as any)?.error || 'Falha ao carregar casos.');
      setLoading(false);
      return;
    }

    setRows(((json as any) ?? []) as CaseRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const res = await apiFetch('/cases', {
      method: 'POST',
      body: JSON.stringify({
        title: title.trim(),
        status,
        description: description.trim() || null,
      }),
    });

    const json = await res.json().catch(() => ({} as any));
    if (!res.ok) {
      setError(json?.message || json?.error || 'Falha ao criar caso.');
      setSaving(false);
      return;
    }

    setCreateOpen(false);
    setTitle('');
    setStatus('OPEN');
    setDescription('');
    setSaving(false);
    await load();
  }

  function statusLabel(s: CaseRow['status']) {
    if (s === 'OPEN') return 'Aberto';
    if (s === 'ON_HOLD') return 'Em espera';
    return 'Encerrado';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Casos</h1>
          <p className="text-sm text-white/60">Lista conectada na API.</p>
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
            <div className="grid gap-3">
              <label className="text-sm text-white/80">
                Título
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-white/80">
                  Status
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="OPEN">Aberto</option>
                    <option value="ON_HOLD">Em espera</option>
                    <option value="CLOSED">Encerrado</option>
                  </select>
                </label>
              </div>

              <label className="text-sm text-white/80">
                Descrição
                <textarea
                  className="mt-1 min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                        {statusLabel(c.status)}
                      </span>
                    </td>
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
