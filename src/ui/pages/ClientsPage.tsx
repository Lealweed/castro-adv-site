import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { ClientAvatar } from '@/ui/widgets/ClientAvatar';
import { formatCpf, isValidCpf, onlyDigits } from '@/lib/cpf';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type ClientRow = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  avatar_path: string | null;
  created_at: string;
};

export function ClientsPage() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
        .select('id,name,cpf,phone,email,avatar_path,created_at')
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
    if (!newCpf.trim()) {
      setError('CPF é obrigatório.');
      return;
    }
    if (!isValidCpf(newCpf)) {
      setError('CPF inválido.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      const { data: created, error: iErr } = await sb
        .from('clients')
        .insert({
          user_id: user.id,
          name: newName.trim(),
          cpf: onlyDigits(newCpf),
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
        } as any)
        .select('id,office_id')
        .single();

      if (iErr) throw new Error(iErr.message);

      // Optional avatar upload
      if (avatarFile && created?.id && created?.office_id) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `office/${created.office_id}/client/${created.id}/avatar.${ext}`;

        const up = await sb.storage
          .from('client_avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type || undefined } as any);
        if (up.error) throw new Error(up.error.message);

        const { error: uErr } = await sb
          .from('clients')
          .update({ avatar_path: path, avatar_updated_at: new Date().toISOString() } as any)
          .eq('id', created.id);
        if (uErr) throw new Error(uErr.message);
      }

      setCreateOpen(false);
      setNewName('');
      setNewCpf('');
      setNewEmail('');
      setNewPhone('');
      setAvatarFile(null);
      setAvatarPreview(null);
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

              <div className="text-sm text-white/80">
                Foto (opcional)
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full border border-white/10 bg-white/5 overflow-hidden">
                    {avatarPreview ? <img src={avatarPreview} className="h-full w-full object-cover" /> : null}
                  </div>
                  <label className="btn-ghost !rounded-lg !px-3 !py-2 !text-xs">
                    {avatarFile ? 'Trocar foto' : 'Adicionar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setAvatarFile(f);
                        setAvatarPreview(f ? URL.createObjectURL(f) : null);
                      }}
                    />
                  </label>
                  {avatarFile ? (
                    <button
                      type="button"
                      className="btn-ghost !rounded-lg !px-3 !py-2 !text-xs"
                      onClick={() => {
                        setAvatarFile(null);
                        setAvatarPreview(null);
                      }}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
              <label className="text-sm text-white/80">
                CPF <span className="text-red-200">*</span>
                <input
                  className="input"
                  value={newCpf}
                  onChange={(e) => setNewCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
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
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <ClientAvatar name={c.name} avatarPath={c.avatar_path} size={36} />
                          <div>
                            <div>{c.name}</div>
                            <div className="text-xs text-white/50">CPF: {c.cpf || '—'}</div>
                          </div>
                        </div>
                      </td>
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
                  <div className="flex items-start gap-3">
                    <ClientAvatar name={c.name} avatarPath={c.avatar_path} size={44} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{c.name}</div>
                      <div className="mt-1 text-xs text-white/50">CPF: {c.cpf || '—'}</div>
                      <div className="mt-2 text-xs text-white/60">
                        <div>{c.phone || '—'}</div>
                        <div className="mt-0.5 text-white/50">{c.email || '—'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-200">Abrir →</div>
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
