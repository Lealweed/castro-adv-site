import { useEffect, useState } from 'react';
import {
  Activity,
  Briefcase,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Mail,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { requireSupabase } from '@/lib/supabaseDb';
import {
  createOfficeUser,
  fetchOfficeUsersStatus,
  generateStrongPassword,
  getOfficeRoleLabel,
  OFFICE_ROLE_OPTIONS,
  resetOfficeUserPassword,
  type CreateOfficeUserResult,
  type OfficeAuthStatusMap,
  type OfficeRole,
  type UnlinkedAuthUser,
} from '@/lib/officeUsers';
import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';

type Member = {
  id: string;
  user_id: string;
  role: OfficeRole | string;
  email?: string;
  full_name?: string;
  oab_number?: string;
  oab_uf?: string;
  phone?: string;
  whatsapp?: string;
  created_at: string;
  stats?: {
    activeCases: number;
    tasksDone: number;
    tasksOverdue: number;
  };
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  oab_number: string | null;
  oab_uf: string | null;
  phone: string | null;
  whatsapp: string | null;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['Acesso total', 'Financeiro & Asaas', 'Gerenciar equipe & senhas', 'Configurações & auditoria'],
  member: ['Criar/Editar casos', 'Gerenciar tarefas', 'Ver clientes', 'Adicionar andamentos'],
  staff: ['Ver agenda', 'Atendimento / triagem', 'Lançar tarefas operacionais', 'Apoio à secretaria'],
  finance: ['Ver financeiro & Asaas', 'Gerar cobranças', 'Aprovar pagamentos', 'Relatórios financeiros'],
};

function formatDateTimePt(iso: string | null | undefined) {
  if (!iso) return 'Nunca acessou';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCredentialsMessage(email: string, password?: string) {
  const loginUrl =
    typeof window !== 'undefined' && window.location.origin
      ? `${window.location.origin}/app/login`
      : 'https://www.castrodeoliveiraadv.org/app/login';
  const lines = [`Acesso ao CRM Castro & Oliveira`, `Link: ${loginUrl}`, `E-mail: ${email}`];
  if (password) {
    lines.push(`Senha inicial: ${password}`);
  } else {
    lines.push('Senha: use o link enviado para o seu e-mail ou clique em "Primeiro Acesso / Esqueci a Senha".');
  }
  return lines.join('\n');
}

export function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Status do Supabase Auth & contas sem vínculo
  const [authStatusByUserId, setAuthStatusByUserId] = useState<OfficeAuthStatusMap>({});
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedAuthUser[]>([]);
  const [unlinkedRoles, setUnlinkedRoles] = useState<Record<string, OfficeRole>>({});
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);

  // Formulário de criação de novo usuário
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<OfficeRole>('member');
  const [passwordMode, setPasswordMode] = useState<'manual' | 'email'>('manual');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [newOabNumber, setNewOabNumber] = useState('');
  const [newOabUf, setNewOabUf] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdBanner, setCreatedBanner] = useState<{
    result: CreateOfficeUserResult;
    initialPassword?: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Edição do perfil do membro selecionado
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editOabNumber, setEditOabNumber] = useState('');
  const [editOabUf, setEditOabUf] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Redefinição de senha do membro selecionado
  const [memberNewPassword, setMemberNewPassword] = useState('');
  const [showMemberNewPassword, setShowMemberNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedMember) return;
    setEditDisplayName(selectedMember.full_name || '');
    setEditOabNumber(selectedMember.oab_number || '');
    setEditOabUf(selectedMember.oab_uf || '');
    setEditPhone(selectedMember.phone || '');
    setEditWhatsapp(selectedMember.whatsapp || '');
    setMemberNewPassword('');
    setPasswordFeedback(null);
  }, [selectedMember?.id]);

  async function loadTeam() {
    try {
      setLoading(true);
      const sb = requireSupabase();
      const [{ data, error }, authStatus] = await Promise.all([
        sb.from('office_members').select('id, user_id, role, created_at').order('created_at', { ascending: true }),
        fetchOfficeUsersStatus().catch(() => null),
      ]);
      if (error) throw error;

      if (authStatus) {
        setAuthStatusByUserId(authStatus.authStatusByUserId || {});
        setUnlinkedUsers(authStatus.unlinkedUsers || []);
        setUnlinkedRoles((prev) => {
          const next = { ...prev };
          for (const u of authStatus.unlinkedUsers || []) {
            if (!next[u.id]) next[u.id] = 'member';
          }
          return next;
        });
      }

      const userIds = (data || []).map((m: any) => m.user_id).filter(Boolean);
      let profilesData: UserProfileRow[] = [];
      if (userIds.length > 0) {
        const { data: pd, error: pe } = await sb
          .from('user_profiles')
          .select('user_id, display_name, email, oab_number, oab_uf, phone, whatsapp')
          .in('user_id', userIds);
        profilesData = (pd || []) as UserProfileRow[];
        if ((!profilesData || profilesData.length === 0) && !pe) {
          const { data: allProfiles } = await sb
            .from('user_profiles')
            .select('user_id, display_name, email, oab_number, oab_uf, phone, whatsapp');
          profilesData = ((allProfiles || []) as UserProfileRow[]).filter((p) => userIds.includes(p.user_id));
        }
      }
      const profilesMap = new Map<string, UserProfileRow>(profilesData.map((p) => [p.user_id, p]));

      const now = Date.now();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartMs = monthStart.getTime();

      const [{ data: casesData }, { data: tasksData }] = await Promise.all([
        sb.from('cases').select('id,responsible_user_id,status').limit(2000),
        sb.from('tasks').select('id,assigned_to_user_id,status_v2,due_at,done_at').limit(3000),
      ]);

      const activeCasesByUser = new Map<string, number>();
      for (const c of (casesData || []) as any[]) {
        const uid = c.responsible_user_id;
        if (!uid) continue;
        const st = String(c.status || '').toLowerCase();
        if (['arquivado', 'encerrado', 'closed'].includes(st)) continue;
        activeCasesByUser.set(uid, (activeCasesByUser.get(uid) || 0) + 1);
      }

      const tasksDoneByUser = new Map<string, number>();
      const tasksOverdueByUser = new Map<string, number>();
      for (const t of (tasksData || []) as any[]) {
        const uid = t.assigned_to_user_id;
        if (!uid) continue;
        const st = String(t.status_v2 || '').toLowerCase();
        if (st === 'done') {
          const doneMs = t.done_at ? new Date(t.done_at).getTime() : monthStartMs;
          if (doneMs >= monthStartMs) {
            tasksDoneByUser.set(uid, (tasksDoneByUser.get(uid) || 0) + 1);
          }
        } else if (st !== 'cancelled' && t.due_at && new Date(t.due_at).getTime() < now) {
          tasksOverdueByUser.set(uid, (tasksOverdueByUser.get(uid) || 0) + 1);
        }
      }

      const enriched: Member[] = (data || []).map((m: any) => {
        const p = profilesMap.get(m.user_id);
        return {
          ...m,
          email: p?.email || '',
          full_name: p?.display_name || p?.email?.split('@')[0] || 'Usuário',
          oab_number: p?.oab_number || '',
          oab_uf: p?.oab_uf || '',
          phone: p?.phone || '',
          whatsapp: p?.whatsapp || '',
          stats: {
            activeCases: activeCasesByUser.get(m.user_id) || 0,
            tasksDone: tasksDoneByUser.get(m.user_id) || 0,
            tasksOverdue: tasksOverdueByUser.get(m.user_id) || 0,
          },
        };
      });

      setMembers(enriched);
      if (enriched.length > 0 && !selectedMember) {
        setSelectedMember(enriched[0]);
      } else if (selectedMember) {
        const updated = enriched.find((m) => m.id === selectedMember.id) || enriched[0] || null;
        setSelectedMember(updated);
      }
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreatedBanner(null);

    if (newName.trim().length < 2) {
      setCreateError('Informe o nome completo do colaborador.');
      return;
    }
    if (!newEmail.trim()) {
      setCreateError('Informe o e-mail de acesso.');
      return;
    }
    if (passwordMode === 'manual' && newPassword.trim().length < 6) {
      setCreateError('Informe uma senha inicial com pelo menos 6 caracteres (ou use "Gerar").');
      return;
    }

    setCreating(true);
    try {
      const passwordToSend = passwordMode === 'manual' ? newPassword.trim() : undefined;
      const result = await createOfficeUser({
        fullName: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        password: passwordToSend,
        sendRecoveryEmail: passwordMode === 'email',
        oabNumber: newOabNumber.trim() || undefined,
        oabUf: newOabUf.trim().toUpperCase() || undefined,
        whatsapp: newWhatsapp.trim() || undefined,
      });

      setCreatedBanner({
        result,
        initialPassword: result.createdInAuth ? passwordToSend : undefined,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewOabNumber('');
      setNewOabUf('');
      setNewWhatsapp('');
      setShowExtraFields(false);
      await loadTeam();
    } catch (err: any) {
      setCreateError(err?.message || 'Não foi possível criar o usuário.');
    } finally {
      setCreating(false);
    }
  }

  async function handleLinkExisting(u: UnlinkedAuthUser) {
    const role = unlinkedRoles[u.id] || 'member';
    setLinkingUserId(u.id);
    setCreateError(null);
    setCreatedBanner(null);
    try {
      const result = await createOfficeUser({
        fullName: u.fullName || u.email.split('@')[0],
        email: u.email,
        role,
      });
      setCreatedBanner({ result });
      await loadTeam();
    } catch (err: any) {
      setCreateError(err?.message || `Falha ao vincular ${u.email}.`);
    } finally {
      setLinkingUserId(null);
    }
  }

  async function updateRole(memberId: string, roleValue: string) {
    const sb = requireSupabase();
    const { error } = await sb.from('office_members').update({ role: roleValue }).eq('id', memberId);

    if (error) {
      alert('Erro ao atualizar cargo: ' + error.message);
    } else {
      await loadTeam();
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Tem certeza que deseja remover este membro da equipe? O acesso dele será revogado imediatamente.'))
      return;

    const sb = requireSupabase();
    const { error } = await sb.from('office_members').delete().eq('id', memberId);

    if (error) {
      alert('Erro ao remover: ' + error.message);
    } else {
      setSelectedMember(null);
      await loadTeam();
    }
  }

  async function saveSelectedProfile() {
    if (!selectedMember) return;
    setSavingProfile(true);
    try {
      const sb = requireSupabase();
      const { error } = await sb
        .from('user_profiles')
        .update({
          display_name: editDisplayName.trim() || null,
          oab_number: editOabNumber.trim() || null,
          oab_uf: editOabUf.trim().toUpperCase().slice(0, 2) || null,
          phone: editPhone.trim() || null,
          whatsapp: editWhatsapp.trim() || null,
        })
        .eq('user_id', selectedMember.user_id);

      if (error) throw error;
      alert('Perfil salvo com sucesso!');
      await loadTeam();
    } catch (err: any) {
      alert('Erro ao atualizar perfil: ' + (err?.message || 'Falha inesperada.'));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendPasswordEmail() {
    if (!selectedMember) return;
    setResettingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await resetOfficeUserPassword({
        userId: selectedMember.user_id,
        email: selectedMember.email,
      });
      setPasswordFeedback({
        type: 'ok',
        text: `Link de redefinição enviado para ${res.email || selectedMember.email}.`,
      });
    } catch (err: any) {
      setPasswordFeedback({
        type: 'err',
        text: err?.message || 'Falha ao enviar link de redefinição.',
      });
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSetMemberPassword() {
    if (!selectedMember) return;
    if (memberNewPassword.trim().length < 6) {
      setPasswordFeedback({ type: 'err', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    setResettingPassword(true);
    setPasswordFeedback(null);
    try {
      await resetOfficeUserPassword({
        userId: selectedMember.user_id,
        email: selectedMember.email,
        newPassword: memberNewPassword.trim(),
      });
      setPasswordFeedback({
        type: 'ok',
        text: 'Senha atualizada diretamente no Supabase Auth com sucesso!',
      });
      setMemberNewPassword('');
    } catch (err: any) {
      setPasswordFeedback({
        type: 'err',
        text: err?.message || 'Falha ao definir nova senha.',
      });
    } finally {
      setResettingPassword(false);
    }
  }

  async function copyCreatedAccess() {
    if (!createdBanner) return;
    const text = buildCredentialsMessage(createdBanner.result.user.email, createdBanner.initialPassword);
    await navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 2500);
  }

  const normalizedSelectedRole = String(selectedMember?.role || 'member').toLowerCase();
  const selectRoleValue = ['admin', 'member', 'staff', 'finance'].includes(normalizedSelectedRole)
    ? normalizedSelectedRole
    : 'member';

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersRound}
        eyebrow="Sistema"
        title="Gestão de Equipe & Usuários"
        subtitle="Crie logins completos dentro do painel, vincule contas existentes, defina senhas e controle permissões (RBAC)."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Coluna Esquerda: Criar Usuário, Contas sem vínculo e Membros Ativos */}
        <div className="xl:col-span-1 space-y-4">
          <Card className="p-5 border border-sky-400/20">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-sky-400" />
                <h3 className="font-semibold text-white">Criar Novo Usuário</h3>
              </div>
              <span className="badge badge-gold text-[10px]">Acesso direto</span>
            </div>
            <p className="text-xs text-white/60 mb-3 leading-relaxed">
              Cria a conta no Supabase Auth e já libera o acesso ao escritório imediatamente, sem precisar abrir o painel externo.
            </p>

            {createError ? (
              <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {createError}
              </div>
            ) : null}

            {createdBanner ? (
              <div className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100 space-y-2">
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {createdBanner.result.createdInAuth
                    ? 'Usuário criado e vinculado!'
                    : createdBanner.result.alreadyLinked
                      ? 'Membro atualizado com sucesso!'
                      : 'Conta vinculada ao escritório!'}
                </div>
                <div className="text-white/80">
                  <b>{createdBanner.result.user.fullName}</b> ({createdBanner.result.user.email}) ·{' '}
                  {getOfficeRoleLabel(createdBanner.result.user.role)}
                </div>
                {createdBanner.result.recoveryEmailSent ? (
                  <div className="text-emerald-200/90">
                    Link enviado para o e-mail do colaborador definir a senha.
                  </div>
                ) : null}
                {createdBanner.result.recoveryWarning ? (
                  <div className="text-amber-200/90">
                    Aviso no envio do e-mail: {createdBanner.result.recoveryWarning}. Use a opção de definir senha manual.
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void copyCreatedAccess()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/25"
                >
                  {copiedCredentials ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCredentials ? 'Dados copiados!' : 'Copiar dados de acesso'}
                </button>
              </div>
            ) : null}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs text-white/70 block mb-1">Nome completo</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input !mt-0 !py-2 !text-sm"
                  placeholder="Ex: Dra. Maria Silva"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">E-mail de acesso</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input !mt-0 !py-2 !text-sm"
                  placeholder="colaborador@castro.adv.br"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white/70 block mb-1">Cargo / Permissão</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as OfficeRole)}
                  className="select !mt-0 !py-2 !text-sm"
                >
                  {OFFICE_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPasswordMode('manual')}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      passwordMode === 'manual'
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    Definir senha agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordMode('email')}
                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                      passwordMode === 'email'
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
                        : 'text-white/60 hover:bg-white/5'
                    }`}
                  >
                    Enviar link por e-mail
                  </button>
                </div>

                {passwordMode === 'manual' ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input !mt-0 !py-2 pr-9 !text-sm"
                        placeholder="Mín. 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPassword(generateStrongPassword());
                        setShowNewPassword(true);
                      }}
                      className="btn-ghost !px-3 !py-2 !text-xs shrink-0"
                      title="Gerar senha segura aleatória"
                    >
                      Gerar
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    O usuário receberá um e-mail do Supabase para criar a própria senha no primeiro login.
                  </p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowExtraFields((v) => !v)}
                  className="text-xs text-sky-300 hover:text-sky-200 hover:underline"
                >
                  {showExtraFields ? '− Ocultar OAB e WhatsApp' : '+ Dados adicionais (OAB / WhatsApp)'}
                </button>
                {showExtraFields ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newOabNumber}
                      onChange={(e) => setNewOabNumber(e.target.value)}
                      className="input !mt-0 !py-1.5 !text-xs col-span-2"
                      placeholder="OAB (ex: 28811)"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={newOabUf}
                      onChange={(e) => setNewOabUf(e.target.value.toUpperCase())}
                      className="input !mt-0 !py-1.5 !text-xs uppercase"
                      placeholder="UF"
                    />
                    <input
                      type="text"
                      inputMode="tel"
                      value={newWhatsapp}
                      onChange={(e) => setNewWhatsapp(e.target.value)}
                      className="input !mt-0 !py-1.5 !text-xs col-span-3"
                      placeholder="WhatsApp (ex: 5591999999999)"
                    />
                  </div>
                ) : null}
              </div>

              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Criando acesso…' : 'Criar Usuário no Sistema'}
              </Button>
            </form>
          </Card>

          {unlinkedUsers.length > 0 ? (
            <Card className="p-5 border border-amber-400/25 bg-amber-400/[0.04]">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-amber-300" />
                <h3 className="font-semibold text-amber-100 text-sm">
                  Contas existentes sem vínculo ({unlinkedUsers.length})
                </h3>
              </div>
              <p className="text-xs text-white/60 mb-3">
                Usuários já cadastrados no Auth que ainda não estão vinculados ao escritório.
              </p>
              <div className="space-y-2.5">
                {unlinkedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{u.fullName}</div>
                      <div className="text-[11px] text-white/60 truncate">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={unlinkedRoles[u.id] || 'member'}
                        onChange={(e) =>
                          setUnlinkedRoles((prev) => ({
                            ...prev,
                            [u.id]: e.target.value as OfficeRole,
                          }))
                        }
                        className="select !mt-0 !py-1.5 !text-xs flex-1"
                      >
                        {OFFICE_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={linkingUserId === u.id}
                        onClick={() => void handleLinkExisting(u)}
                        className="btn-primary !px-3 !py-1.5 !text-xs shrink-0"
                      >
                        {linkingUserId === u.id ? 'Vinculando…' : 'Vincular'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 font-semibold flex justify-between items-center">
              Membros Ativos
              <span className="badge bg-white/10 text-white/70">{members.length}</span>
            </div>
            {loading ? (
              <div className="p-6 text-center text-white/50">Carregando equipe...</div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center text-white/50">Nenhum membro encontrado.</div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[380px] overflow-y-auto">
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-colors ${
                      selectedMember?.id === m.id
                        ? 'bg-sky-400/10 border-l-2 border-sky-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{m.full_name}</div>
                      <div className="text-[11px] text-white/50 truncate">{m.email || '—'}</div>
                    </div>
                    <span className="text-[10px] text-sky-300 font-mono uppercase shrink-0 ml-2">
                      {getOfficeRoleLabel(m.role)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Coluna Direita: Dashboard do Membro Selecionado */}
        <div className="xl:col-span-2 space-y-4">
          {selectedMember ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-100">Casos Ativos</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{selectedMember.stats?.activeCases}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-100">Tarefas no Mês</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{selectedMember.stats?.tasksDone}</div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-rose-400" />
                    <span className="text-sm font-semibold text-rose-100">SLA Atrasado</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{selectedMember.stats?.tasksOverdue}</div>
                </Card>
              </div>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedMember.full_name}</h3>
                    <p className="text-sm text-white/60">{selectedMember.email || '—'}</p>
                    <p className="text-xs text-sky-300/80 mt-1">
                      Último acesso: {formatDateTimePt(authStatusByUserId[selectedMember.user_id]?.lastSignInAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectRoleValue}
                      onChange={(e) => void updateRole(selectedMember.id, e.target.value)}
                      className="select !mt-0 !w-auto !py-1.5 !text-sm"
                    >
                      {OFFICE_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void removeMember(selectedMember.id)}
                      className="text-red-400 border border-red-400/30 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Revogar Acesso
                    </button>
                  </div>
                </div>

                {['admin', 'member'].includes(selectRoleValue) && (
                  <div className="mb-5 bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="text-sm font-semibold text-blue-200 mb-2">
                      Integração PJe (Intimações Automáticas)
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <label className="text-xs text-white/60 flex-1 min-w-[120px]">
                        Número OAB
                        <input
                          className="input mt-1 !py-2 !text-sm"
                          placeholder="Ex: 28811"
                          value={editOabNumber}
                          onChange={(e) => setEditOabNumber(e.target.value)}
                        />
                      </label>
                      <label className="text-xs text-white/60 w-24">
                        UF OAB
                        <input
                          className="input mt-1 !py-2 !text-sm uppercase"
                          placeholder="Ex: PA"
                          maxLength={2}
                          value={editOabUf}
                          onChange={(e) => setEditOabUf(e.target.value.toUpperCase())}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-white/40 mt-2">
                      Ao preencher, o sistema fará a varredura automática do Diário de Justiça Eletrônico Nacional vinculando as intimações ao perfil.
                    </p>
                  </div>
                )}

                <div className="mb-5 bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="text-sm font-semibold text-white/80">
                    Perfil & Contato (Exibição, WhatsApp e n8n)
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs text-white/60">
                      Nome de exibição
                      <input
                        className="input mt-1 !py-2 !text-sm"
                        placeholder="Nome do colaborador"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      Telefone
                      <input
                        className="input mt-1 !py-2 !text-sm"
                        placeholder="Ex: 9132223333"
                        inputMode="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-white/60">
                      WhatsApp (notificações n8n)
                      <input
                        className="input mt-1 !py-2 !text-sm"
                        placeholder="Ex: 5591991091404"
                        inputMode="tel"
                        value={editWhatsapp}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => void saveSelectedProfile()}
                      className="btn-primary !px-4 !py-2 !text-sm"
                    >
                      {savingProfile ? 'Salvando…' : 'Salvar Perfil'}
                    </button>
                  </div>
                </div>

                {/* Segurança & Senha */}
                <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-300" />
                      <span className="text-sm font-semibold text-amber-100">Segurança & Redefinição de Senha</span>
                    </div>
                    <button
                      type="button"
                      disabled={resettingPassword || !selectedMember.email}
                      onClick={() => void handleSendPasswordEmail()}
                      className="btn-ghost !px-3 !py-1.5 !text-xs border-sky-400/30 text-sky-200 hover:bg-sky-400/10"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Enviar link por e-mail
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <input
                        type={showMemberNewPassword ? 'text' : 'password'}
                        value={memberNewPassword}
                        onChange={(e) => setMemberNewPassword(e.target.value)}
                        placeholder="Definir nova senha diretamente (mín. 6 caracteres)"
                        className="input !mt-0 !py-2 pr-9 !text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMemberNewPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        tabIndex={-1}
                      >
                        {showMemberNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberNewPassword(generateStrongPassword());
                        setShowMemberNewPassword(true);
                      }}
                      className="btn-ghost !px-3 !py-2 !text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Gerar
                    </button>
                    <button
                      type="button"
                      disabled={resettingPassword || memberNewPassword.trim().length < 6}
                      onClick={() => void handleSetMemberPassword()}
                      className="btn-primary !px-4 !py-2 !text-xs"
                    >
                      {resettingPassword ? 'Salvando…' : 'Definir Nova Senha'}
                    </button>
                  </div>

                  {passwordFeedback ? (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
                        passwordFeedback.type === 'ok'
                          ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                          : 'border border-rose-400/30 bg-rose-400/10 text-rose-200'
                      }`}
                    >
                      {passwordFeedback.type === 'err' ? <ShieldAlert className="h-4 w-4 shrink-0" /> : null}
                      <span>{passwordFeedback.text}</span>
                    </div>
                  ) : null}
                </div>

                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">O que este perfil pode fazer:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(ROLE_PERMISSIONS[selectRoleValue] || ROLE_PERMISSIONS.member).map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        {perm}
                      </div>
                    ))}
                    {selectRoleValue !== 'admin' && selectRoleValue !== 'finance' && (
                      <div className="flex items-center gap-2 text-sm text-white/40 line-through">
                        <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0 text-[8px]">
                          x
                        </span>
                        Acesso financeiro completo / Asaas
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-10 text-white/40">
              <Users className="w-12 h-12 mb-3 opacity-20" />
              <p>Selecione um membro ao lado para ver o desempenho e configurar permissões.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
