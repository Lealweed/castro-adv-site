import { Check, Copy, Eye, EyeOff, ShieldCheck, SlidersHorizontal, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { acceptOfficeInvite, createOfficeInvite, listMyOfficeInvites } from '@/lib/offices';
import {
  createOfficeUser,
  generateStrongPassword,
  getOfficeRoleLabel,
  type CreateOfficeUserResult,
  type OfficeRole,
} from '@/lib/officeUsers';
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

type OfficeInviteRow = {
  id: string;
  office_id: string;
  email: string;
  role: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
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

function isOfficeMembersPolicyError(msg: string) {
  return msg.toLowerCase().includes('infinite recursion detected in policy for relation "office_members"');
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [policyBlocked, setPolicyBlocked] = useState(false);

  const [meId, setMeId] = useState<string>('');

  const [office, setOffice] = useState<Office | null>(null);
  const [members, setMembers] = useState<OfficeMemberRow[]>([]);
  const [invites, setInvites] = useState<OfficeInviteRow[]>([]);

  // legacy manual add
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'member' | 'admin' | 'finance' | 'staff'>('member');

  // new invite flow
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'finance' | 'staff'>('member');

  // direct user creation
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<OfficeRole>('member');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    result: CreateOfficeUserResult;
    initialPassword?: string;
  } | null>(null);
  const [copiedNewAccess, setCopiedNewAccess] = useState(false);

  const [saving, setSaving] = useState(false);
  const [myWhatsapp, setMyWhatsapp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const myMember = useMemo(() => members.find((m) => m.user_id === meId) || null, [members, meId]);
  const isAdmin = myMember?.role === 'admin';

  async function load() {
    setLoading(true);
    setError(null);
    setPolicyBlocked(false);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();
      setMeId(user.id);

      // load invites even when office query fails
      const myInvites = await listMyOfficeInvites().catch(() => [] as OfficeInviteRow[]);
      setInvites((myInvites || []) as OfficeInviteRow[]);

      // Carrega WhatsApp do próprio perfil
      const { data: selfProfile } = await sb
        .from('user_profiles')
        .select('whatsapp')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyWhatsapp((selfProfile as any)?.whatsapp || '');

      // Find my office by membership
      const { data: myMembership, error: memErr } = await sb
        .from('office_members')
        .select('office_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memErr) {
        if (isOfficeMembersPolicyError(memErr.message || '')) {
          setPolicyBlocked(true);
          setOffice(null);
          setMembers([]);
          setLoading(false);
          return;
        }
        throw new Error(memErr.message);
      }
      const officeId = myMembership?.office_id as string | undefined;

      if (!officeId) {
        setOffice(null);
        setMembers([]);
        setLoading(false);
        return;
      }

      const [{ data: officeRow, error: oErr }, { data: ms, error: msErr }] = await Promise.all([
        sb.from('offices').select('id,name,created_at').eq('id', officeId).maybeSingle(),
        sb.from('office_members').select('id,office_id,user_id,role,created_at').eq('office_id', officeId).order('created_at', { ascending: true }),
      ]);

      if (oErr) throw new Error(oErr.message);
      if (msErr) {
        if (isOfficeMembersPolicyError(msErr.message || '')) {
          setPolicyBlocked(true);
          setOffice((officeRow || null) as Office | null);
          setMembers([]);
          setLoading(false);
          return;
        }
        throw new Error(msErr.message);
      }

      const members = (ms || []) as OfficeMemberRow[];
      const userIds = Array.from(new Set(members.map((m) => m.user_id).filter(Boolean)));

      // Avoid PostgREST relationship cache errors by fetching profiles separately.
      let profMap = new Map<string, any>();
      if (userIds.length) {
        const { data: profs } = await sb.from('user_profiles').select('user_id,email,display_name').in('user_id', userIds).limit(500);
        profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      }

      setOffice((officeRow || null) as Office | null);
      setMembers(
        members.map((m) => ({
          ...m,
          profile: m.user_id && profMap.get(m.user_id) ? profMap.get(m.user_id) : null,
        })) as OfficeMemberRow[],
      );
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
    // legacy/manual add (kept) — requires user to have logged in once
    const email = addEmail.trim().toLowerCase();
    if (!email) return;
    if (!office) return;

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data: prof, error: pErr } = await sb
        .from('user_profiles')
        .select('user_id,email')
        .ilike('email', email)
        .limit(1)
        .maybeSingle();

      if (pErr) throw new Error(pErr.message);
      const userId = prof?.user_id as string | undefined;
      if (!userId) throw new Error('Usuário não encontrado.');

      const { error: iErr } = await sb.from('office_members').insert({ office_id: office.id, user_id: userId, role: addRole });
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

  async function createInvite() {
    if (!office) return;

    setSaving(true);
    setError(null);

    try {
      await createOfficeInvite({ officeId: office.id, email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setInviteRole('member');
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUserDirect(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserName.trim() || newUserName.trim().length < 2) {
      setError('Informe o nome completo do novo usuário.');
      return;
    }
    if (!newUserEmail.trim()) {
      setError('Informe o e-mail do novo usuário.');
      return;
    }
    const pwd = newUserPassword.trim();
    if (pwd && pwd.length < 6) {
      setError('A senha inicial deve ter no mínimo 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    setError(null);
    setCreatedResult(null);

    try {
      const result = await createOfficeUser({
        fullName: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: newUserRole,
        password: pwd || undefined,
        sendRecoveryEmail: !pwd,
      });

      setCreatedResult({
        result,
        initialPassword: result.createdInAuth && pwd ? pwd : undefined,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('member');
      setNewUserPassword('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar usuário.');
    } finally {
      setCreatingUser(false);
    }
  }

  async function copyNewUserAccess() {
    if (!createdResult) return;
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://www.castrodeoliveiraadv.org';
    const lines = [
      'Acesso ao CRM Castro & Oliveira',
      `Link: ${origin}/app/login`,
      `E-mail: ${createdResult.result.user.email}`,
    ];
    if (createdResult.initialPassword) {
      lines.push(`Senha inicial: ${createdResult.initialPassword}`);
    }
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopiedNewAccess(true);
    setTimeout(() => setCopiedNewAccess(false), 2500);
  }

  async function acceptInvite(inviteId: string) {
    setSaving(true);
    setError(null);

    try {
      await acceptOfficeInvite(inviteId);
      await load();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveMyWhatsapp() {
    if (!meId) return;
    setSavingProfile(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const { error: uErr } = await sb
        .from('user_profiles')
        .update({ whatsapp: myWhatsapp.trim() || null })
        .eq('user_id', meId);
      if (uErr) throw new Error(uErr.message);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSavingProfile(false);
    }
  }

  // (revogar convite) será adicionado quando listarmos convites do escritório para admin

  async function setRole(memberId: string, role: string) {
    if (!office) return;

    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();
      const { error: uErr } = await sb.from('office_members').update({ role }).eq('id', memberId);
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
      <PageHeader
        icon={SlidersHorizontal}
        eyebrow="Sistema"
        title="Configurações"
        subtitle="Escritório, perfil, WhatsApp corporativo, membros e permissões."
      />

      {error ? <div className="text-sm text-red-200">{error}</div> : null}
      {policyBlocked ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          A política RLS de <strong>office_members</strong> está com recursão infinita. A tela continua acessível,
          mas ações de membros/permissões ficam bloqueadas até ajustar as policies no Supabase.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white">Meu Perfil</div>
          <div className="mt-3 grid gap-3">
            <label className="text-sm text-white/80">
              WhatsApp (para notificações n8n)
              <input
                className="input"
                inputMode="tel"
                value={myWhatsapp}
                onChange={(e) => setMyWhatsapp(e.target.value)}
                placeholder="Ex: 5511999999999"
              />
            </label>
            <p className="text-xs text-white/50">Formato internacional sem espaços ou hífen. Usado pelo n8n para cobrança de tarefas.</p>
            <button
              className="btn-primary !text-sm"
              disabled={savingProfile}
              onClick={() => void saveMyWhatsapp()}
            >
              {savingProfile ? 'Salvando…' : 'Salvar WhatsApp'}
            </button>
          </div>
        </Card>

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
              
              {isAdmin ? (
                <div className="grid gap-2">
                  <Link className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3.5 text-sm font-semibold text-white transition-colors hover:border-sky-400/30 hover:bg-white/[0.08]" to="/app/configuracoes/equipe">
                    <UsersRound className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
                    Gerenciar Equipe
                  </Link>
                  <Link className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3.5 text-sm font-semibold text-sky-200 transition-colors hover:border-sky-400/30 hover:bg-white/[0.08]" to="/app/configuracoes/auditoria">
                    <ShieldCheck className="h-4 w-4 text-sky-300" strokeWidth={1.75} />
                    Auditoria e Logs
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white">Seus Convites</div>

          {invites.length ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <div className="text-sm font-semibold text-amber-100">Convites pendentes para você</div>
              <div className="mt-2 grid gap-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{inv.email}</div>
                      <div className="mt-1 text-xs text-white/60">Papel: {roleLabel(inv.role)}</div>
                    </div>
                    <button className="btn-primary !rounded-lg !px-3 !py-2 !text-xs" disabled={saving} onClick={() => void acceptInvite(inv.id)}>
                      Aceitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {office && isAdmin && !policyBlocked ? (
            <div className="mt-4 grid gap-4">
              <form
                onSubmit={handleCreateUserDirect}
                className="rounded-2xl border border-sky-400/25 bg-sky-400/[0.05] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <UserPlus className="h-4 w-4 text-sky-400" />
                    Criar novo usuário (acesso imediato)
                  </div>
                  <Link
                    to="/app/configuracoes/equipe"
                    className="text-xs font-medium text-sky-300 hover:text-sky-200 hover:underline"
                  >
                    OAB, WhatsApp, senhas e contas existentes →
                  </Link>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Cria o login no Supabase Auth e já vincula ao escritório. Se deixar a senha em branco, enviaremos um link para o e-mail informado.
                </p>

                {createdResult ? (
                  <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-2">
                    <div className="font-semibold text-emerald-300">
                      {createdResult.result.createdInAuth
                        ? 'Usuário criado e vinculado ao escritório!'
                        : 'Usuário vinculado/atualizado no escritório!'}{' '}
                      ({createdResult.result.user.email} · {getOfficeRoleLabel(createdResult.result.user.role)})
                    </div>
                    {createdResult.result.recoveryEmailSent ? (
                      <div className="text-emerald-200/90">Link de definição de senha enviado por e-mail.</div>
                    ) : null}
                    {createdResult.result.recoveryWarning ? (
                      <div className="text-amber-200/90">Aviso: {createdResult.result.recoveryWarning}</div>
                    ) : null}
                    {createdResult.initialPassword ? (
                      <button
                        type="button"
                        onClick={() => void copyNewUserAccess()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/25"
                      >
                        {copiedNewAccess ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedNewAccess ? 'Dados copiados!' : 'Copiar dados de acesso'}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-white/80">
                    Nome completo
                    <input
                      className="input"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Ex: Dra. Maria Silva"
                      required
                    />
                  </label>

                  <label className="text-sm text-white/80">
                    E-mail
                    <input
                      type="email"
                      className="input"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="email@dominio.com"
                      required
                    />
                  </label>

                  <label className="text-sm text-white/80">
                    Papel
                    <select
                      className="select"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as OfficeRole)}
                    >
                      <option value="member">Advogado / Membro</option>
                      <option value="staff">Operacional / Secretaria</option>
                      <option value="finance">Financeiro</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <label className="text-sm text-white/80">
                    Senha inicial (opcional)
                    <div className="mt-1 flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          className="input !mt-0 pr-9"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Em branco = envia link"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                          tabIndex={-1}
                        >
                          {showNewUserPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewUserPassword(generateStrongPassword());
                          setShowNewUserPassword(true);
                        }}
                        className="btn-ghost !px-3 !py-2 !text-xs shrink-0"
                      >
                        Gerar
                      </button>
                    </div>
                  </label>
                </div>

                <div className="pt-1 flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary" disabled={creatingUser}>
                    {creatingUser ? 'Criando acesso…' : 'Criar usuário'}
                  </button>
                </div>
              </form>

              <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white">
                  Convite manual / legado
                </summary>

                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <div className="text-sm font-semibold text-white">Criar convite (por e-mail)</div>
                    <div className="mt-1 text-xs text-white/60">
                      A pessoa precisa fazer login com esse e-mail para conseguir aceitar.
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-white/80">
                        E-mail
                        <input
                          className="input"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@dominio.com"
                        />
                      </label>

                      <label className="text-sm text-white/80">
                        Papel
                        <select
                          className="select"
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin' | 'finance' | 'staff')}
                        >
                          <option value="member">Membro</option>
                          <option value="staff">Operacional</option>
                          <option value="finance">Financeiro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" className="btn-ghost" disabled={saving} onClick={() => void createInvite()}>
                        {saving ? 'Salvando…' : 'Criar convite'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <div className="text-sm font-semibold text-white">Adicionar membro direto (legado)</div>
                    <div className="mt-1 text-xs text-white/60">Funciona apenas se a pessoa já tiver logado 1 vez.</div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-white/80">
                        E-mail do usuário
                        <input
                          className="input"
                          value={addEmail}
                          onChange={(e) => setAddEmail(e.target.value)}
                          placeholder="email@dominio.com"
                        />
                      </label>

                      <label className="text-sm text-white/80">
                        Papel
                        <select
                          className="select"
                          value={addRole}
                          onChange={(e) => setAddRole(e.target.value as 'member' | 'admin' | 'finance' | 'staff')}
                        >
                          <option value="member">Membro</option>
                          <option value="staff">Operacional</option>
                          <option value="finance">Financeiro</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-3">
                      <button type="button" className="btn-ghost" disabled={saving} onClick={() => void addMember()}>
                        {saving ? 'Salvando…' : 'Adicionar membro'}
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          ) : null}

          {office && !policyBlocked ? (
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
                      disabled={!isAdmin || m.user_id === meId || saving}
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
                      disabled={!isAdmin || m.user_id === meId || saving}
                      onClick={() => void removeMember(m.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}

              {!loading && members.length === 0 ? <div className="text-sm text-white/60">Sem membros.</div> : null}
            </div>
          ) : null}

          {policyBlocked ? (
            <div className="mt-3 text-xs text-amber-100/90">
              Gestão de membros temporariamente indisponível por erro de policy RLS em <code>office_members</code>.
            </div>
          ) : null}

          {!office ? <div className="mt-3 text-xs text-white/60">Aceite um convite para entrar em um escritório.</div> : null}
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
