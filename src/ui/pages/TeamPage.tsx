import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { requireSupabase } from '@/lib/supabaseDb';
import { getMyOfficeId } from '@/lib/officeContext';
import { createOfficeInvite } from '@/lib/offices';
import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { Activity, Briefcase, CheckCircle, Clock, Users, UsersRound } from 'lucide-react';

type Member = {
  id: string;
  user_id: string;
  role: string;
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
  admin: ['Acesso total', 'Financeiro', 'Excluir casos', 'Gerenciar equipe'],
  lawyer: ['Criar/Editar casos', 'Gerenciar tarefas', 'Ver clientes', 'Adicionar andamentos'],
  secretary: ['Ver agenda', 'Adicionar clientes básicos', 'Lançar tarefas simples'],
  finance: ['Ver financeiro', 'Gerar faturas', 'Aprovar pagamentos', 'Relatórios financeiros']
};

export function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('lawyer');
  const [inviting, setInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      setLoading(true);
      const sb = requireSupabase();
      const { data, error } = await sb
        .from('office_members')
        .select('id, user_id, role, created_at');
      if (error) throw error;

      // Garantir que userIds está correto
      const userIds = (data || []).map((m: any) => m.user_id).filter(Boolean);
      // Se não houver userIds, não tente buscar perfis
      let profilesData: UserProfileRow[] = [];
      let profilesError: unknown = null;
      if (userIds.length > 0) {
        const { data: pd, error: pe } = await sb
          .from('user_profiles')
          .select('user_id, display_name, email, oab_number, oab_uf, phone, whatsapp')
          .in('user_id', userIds);
        profilesData = (pd || []) as UserProfileRow[];
        profilesError = pe;
        if (profilesError) console.error('Erro ao buscar user_profiles:', profilesError);
        console.log('Profiles carregados:', profilesData);
        // Se vier vazio, pode ser bug do .in()
        if ((!profilesData || profilesData.length === 0) && !profilesError) {
          // Busca todos e cruza no frontend
          const { data: allProfiles, error: allProfilesError } = await sb
            .from('user_profiles')
            .select('user_id, display_name, email, oab_number, oab_uf, phone, whatsapp');
          if (allProfilesError) {
            console.error('Erro ao buscar todos user_profiles:', allProfilesError);
          } else {
            profilesData = ((allProfiles || []) as UserProfileRow[]).filter((p) => userIds.includes(p.user_id));
            console.log('Profiles carregados (fallback):', profilesData);
          }
        }
      }
      const profilesMap = new Map<string, UserProfileRow>(profilesData.map((p) => [p.user_id, p]));

      // Busca contagens reais de casos e tarefas por membro
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

      // Exibir dados reais, blindado contra falhas
      const enriched = (data || []).map((m: any) => {
        const p = profilesMap.get(m.user_id);
        return {
          ...m,
          email: p?.email || '',
          full_name: p?.display_name || p?.email?.split('@')[0] || '',
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
        const updated = enriched.find((m: any) => m.id === selectedMember.id);
        if (updated) setSelectedMember(updated);
      }
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const officeId = await getMyOfficeId();
      if (!officeId) throw new Error('Escritório não identificado para gerar o convite.');
      const normalizedRole =
        inviteRole === 'lawyer' ? 'member' : inviteRole === 'secretary' ? 'staff' : inviteRole;
      await createOfficeInvite({
        officeId,
        email: inviteEmail.trim(),
        role: normalizedRole,
      });
      alert(`Convite registrado com sucesso para ${inviteEmail.trim()}! O colaborador já pode aceitar ao acessar o painel.`);
      setInviteEmail('');
    } catch (err: any) {
      alert('Erro ao criar convite: ' + (err?.message || 'Falha inesperada.'));
    } finally {
      setInviting(false);
    }
  }

  async function updateRole(memberId: string, newRole: string) {
    const sb = requireSupabase();
    const { error } = await sb
      .from('office_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      alert('Erro ao atualizar cargo: ' + error.message);
    } else {
      loadTeam();
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Tem certeza que deseja remover este membro da equipe? O acesso dele será revogado imediatamente.')) return;

    const sb = requireSupabase();
    const { error } = await sb
      .from('office_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      alert('Erro ao remover: ' + error.message);
    } else {
      loadTeam();
      setSelectedMember(null);
    }
  }

  async function updateProfile(userId: string, oabNumber: string, oabUf: string, phone: string, whatsapp: string) {
    const sb = requireSupabase();
    const { error } = await sb
      .from('user_profiles')
      .update({ oab_number: oabNumber, oab_uf: oabUf, phone: phone.trim() || null, whatsapp: whatsapp.trim() || null })
      .eq('user_id', userId);

    if (error) {
      alert('Erro ao atualizar perfil: ' + error.message);
    } else {
      alert('Perfil salvo com sucesso!');
      loadTeam();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersRound}
        eyebrow="Sistema"
        title="Gestão de Equipe & Desempenho"
        subtitle="Controle de acessos (RBAC), OABs, WhatsApp de alertas e produtividade dos colaboradores."
      />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Coluna Esquerda: Lista e Convite */}
        <div className="xl:col-span-1 space-y-4">
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
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                {members.map((m) => (
                  <button 
                    key={m.id} 
                    onClick={() => setSelectedMember(m)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-colors ${selectedMember?.id === m.id ? 'bg-amber-400/10 border-l-2 border-amber-400' : 'hover:bg-white/5'}`}
                  >
                    <div>
                      <div className="font-medium text-white">{m.full_name}</div>
                      <div className="text-xs text-white/50 font-mono mt-1">{m.role.toUpperCase()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Convidar Novo Membro</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                  placeholder="E-mail (ex: advogado@castro.adv.br)"
                  required
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                  <option value="admin">Sócio / Admin</option>
                  <option value="lawyer">Advogado</option>
                  <option value="secretary">Secretaria</option>
                  <option value="finance">Financeiro</option>
                </select>
                <Button type="submit" disabled={inviting} className="shrink-0">
                  {inviting ? '...' : 'Convidar'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Coluna Direita: Dashboard do Membro Selecionado */}
        <div className="xl:col-span-2 space-y-4">
          {selectedMember ? (
            <>
              {/* Analytics do Membro */}
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

              {/* Matriz Visual de Permissões */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedMember.full_name}</h3>
                    <p className="text-sm text-white/50">{selectedMember.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMember.role}
                      onChange={(e) => updateRole(selectedMember.id, e.target.value)}
                      className="bg-neutral-900 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400"
                    >
                      <option value="admin">Administrador</option>
                      <option value="lawyer">Advogado</option>
                      <option value="secretary">Secretária</option>
                      <option value="finance">Financeiro</option>
                    </select>
                    <button 
                      onClick={() => removeMember(selectedMember.id)}
                      className="text-red-400 border border-red-400/30 hover:bg-red-400/10 px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      Revogar Acesso
                    </button>
                  </div>
                </div>

                {['admin', 'lawyer'].includes(selectedMember.role) && (
                  <div className="mb-5 bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="text-sm font-semibold text-blue-200 mb-2">Integração PJe (Intimações Automáticas)</div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <label className="text-xs text-white/60 flex-1 min-w-[120px]">
                        Número OAB
                        <input 
                          className="input mt-1 !py-2 !text-sm" 
                          placeholder="Ex: 12345" 
                          defaultValue={selectedMember.oab_number || ''}
                          id={`oab_number_${selectedMember.id}`}
                        />
                      </label>
                      <label className="text-xs text-white/60 w-24">
                        UF OAB
                        <input 
                          className="input mt-1 !py-2 !text-sm uppercase" 
                          placeholder="Ex: SP" 
                          maxLength={2}
                          defaultValue={selectedMember.oab_uf || ''}
                          id={`oab_uf_${selectedMember.id}`}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-white/40 mt-2">Ao preencher, o sistema fará a varredura automática do Diário de Justiça Eletrônico Nacional vinculando as intimações ao perfil.</p>
                  </div>
                )}

                <div className="mb-5 bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="text-sm font-semibold text-white/80 mb-2">Dados de Contato (Para N8N / Automações)</div>
                  <div className="flex flex-wrap gap-3 items-end">
                    <label className="text-xs text-white/60 flex-1 min-w-[140px]">
                      Telefone
                      <input 
                        className="input mt-1 !py-2 !text-sm" 
                        placeholder="Ex: 1132223333" 
                        inputMode="tel"
                        defaultValue={selectedMember.phone || ''}
                        id={`phone_${selectedMember.id}`}
                      />
                    </label>
                    <label className="text-xs text-white/60 flex-1 min-w-[160px]">
                      WhatsApp (notificações n8n)
                      <input 
                        className="input mt-1 !py-2 !text-sm" 
                        placeholder="Ex: 5511999999999" 
                        inputMode="tel"
                        defaultValue={selectedMember.whatsapp || ''}
                        id={`whatsapp_${selectedMember.id}`}
                      />
                    </label>
                    <button 
                      onClick={() => {
                        const num = (document.getElementById(`oab_number_${selectedMember.id}`) as HTMLInputElement)?.value || selectedMember.oab_number || '';
                        const uf = (document.getElementById(`oab_uf_${selectedMember.id}`) as HTMLInputElement)?.value || selectedMember.oab_uf || '';
                        const ph = (document.getElementById(`phone_${selectedMember.id}`) as HTMLInputElement)?.value || '';
                        const wa = (document.getElementById(`whatsapp_${selectedMember.id}`) as HTMLInputElement)?.value || '';
                        updateProfile(selectedMember.user_id, num, uf, ph, wa);
                      }}
                      className="btn-primary !px-4 !py-2 !h-[38px] !text-sm shrink-0"
                    >
                      Salvar Perfil
                    </button>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold">O que este perfil pode fazer:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLE_PERMISSIONS[selectedMember.role]?.map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                        {perm}
                      </div>
                    ))}
                    {/* Exemplo visual de bloqueio para papéis não-admin */}
                    {selectedMember.role !== 'admin' && (
                      <div className="flex items-center gap-2 text-sm text-white/40 line-through">
                        <span className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0 text-[8px]">x</span>
                        Acesso financeiro restrito
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
