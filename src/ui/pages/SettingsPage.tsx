import { useEffect, useMemo, useState } from 'react';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type Office = {
  id: string;
  name: string;
  created_at: string;
};

type OfficeMemberRow = {
  id: string;
  office_id: string;
  user_id: string;
  role: 'admin' | 'finance' | 'staff' | 'member' | string;
  created_at: string;
  profile?: {
    email: string | null;
    display_name: string | null;
  } | null;
};

function roleLabel(role: string) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'finance':
      return 'Financeiro';
    case 'staff':
      return 'Operacional';
    default:
      return 'Membro';
  }
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [meId, setMeId] = useState<string>('');

  const [office, setOffice] = useState<Office | null>(null);
  const [members, setMembers] = useState<OfficeMemberRow[]>([]);

  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'member' | 'admin' | 'finance' | 'staff'>('member');
  const [saving, setSaving] = useState(false);

  const myMember = useMemo(() => members.find((m) => m.user_id === meId) || null, [members, meId]);
  const isAdmin = myMember?.role === 'admin';

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();
      setMeId(user.id);

      // Find my office by membership
      const { data: myMembership, error: memErr } = await sb
        .from('office_members')
        .select('office_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memErr) throw new Error(memErr.message);
      const officeId = (myMembership as any)?.office_id as string | undefined;
      if (!officeId) {
        setOffice(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const [{ data: officeRow, error: oErr }, { data: ms, error: msErr }] = await Promise.all([
        sb.from('offices').select('id,name,created_at').eq('id', officeId).maybeSingle(),
        sb
          .from('office_members')
          .select('id,office_id,user_id,role,created_at, profile:user_profiles(email,display_name)')
          .eq('office_id', officeId)
          .order('created_at', { ascending: true }),
      ]);

      if (oErr) throw new Error(oErr.message);
      if (msErr) throw new Error(msErr.message);

      setOffice((officeRow || null) as any);
      setMembers((ms || []) as any);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || String(e));
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addMember() {
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    if (!office) return;

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      // We can only add users that already exist in user_profiles (i.e., logged in at least once).
      const { data: prof, error: pErr } = await sb
        .from('user_profiles')
        .select('user_id,email')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (pErr) throw new Error(pErr.message);
      const userId = (prof as any)?.user_id as string | undefined;
      if (!userId) throw new Error('Usuário não encontrado. Peça para a pessoa fazer login 1 vez para aparecer aqui.');

      const { error: iErr } = await sb.from('office_members').insert({ office_id: office.id, user_id: userId, role: addRole } as any);
      if (iErr) throw new Error(iErr.message);

      setAddEmail('');
      setAddRole('member');
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function setRole(memberId: string, role: string) {
    if (!office) return;

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();
      const { error: uErr } = await sb.from('office_members').update({ role } as any).eq('id', memberId);
      if (uErr) throw new Error(uErr.message);
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!office) return;
    if (!confirm('Remover este membro do escritório?')) return;

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();
      const { error: dErr } = await sb.from('office_members').delete().eq('id', memberId);
      if (dErr) throw new Error(dErr.message);
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-white/60">Escritório, membros e permissões.</p>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Escritório</div>
          {loading ? <div className="mt-3 text-sm text-white/60">Carregando…</div> : null}

          {!loading && !office ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Nenhum escritório vinculado ao seu usuário.
            </div>
          ) : null}

          {!loading && office ? (
            <div className="mt-3 grid gap-3">
              <Field label="Nome" value={office.name} />
              <Field label="Seu papel" value={roleLabel(myMember?.role || 'member')} />
              <Field label="Membros" value={String(members.length)} />
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Membros</div>
          <div className="mt-2 text-xs text-white/60">
            Para adicionar alguém: a pessoa precisa fazer login ao menos 1 vez (para criar o perfil).
          </div>

          {office && isAdmin ? (
            <div className="mt-4 grid gap-3">
              <label className="text-sm text-white/80">
                E-mail do usuário
                <input className="input" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@dominio.com" />
              </label>

              <label className="text-sm text-white/80">
                Papel
                <select className="select" value={addRole} onChange={(e) => setAddRole(e.target.value as any)}>
                  <option value="member">Membro</option>
                  <option value="staff">Operacional</option>
                  <option value="finance">Financeiro</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <button className="btn-primary" disabled={saving} onClick={() => void addMember()}>
                {saving ? 'Salvando…' : 'Adicionar membro'}
              </button>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {m.profile?.display_name || m.profile?.email || m.user_id}
                    {m.user_id === meId ? <span className="badge badge-gold ml-2">você</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-white/60">{m.profile?.email || '—'}</div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="select !mt-0 !w-[160px]"
                    disabled={!office || !isAdmin || m.user_id === meId || saving}
                    value={m.role}
                    onChange={(e) => void setRole(m.id, e.target.value)}
                  >
                    <option value="member">Membro</option>
                    <option value="staff">Operacional</option>
                    <option value="finance">Financeiro</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    className="btn-ghost !rounded-lg !px-3 !py-2 !text-xs"
                    disabled={!office || !isAdmin || m.user_id === meId || saving}
                    onClick={() => void removeMember(m.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}

            {!loading && office && members.length === 0 ? <div className="text-sm text-white/60">Sem membros.</div> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
