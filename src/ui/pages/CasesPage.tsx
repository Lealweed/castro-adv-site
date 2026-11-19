import { ClipboardCheck, Plus, Scale } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { getMyOfficeRole } from '@/lib/roles';
import { getMyOfficeId, listOfficeMemberProfiles, type OfficeMemberProfile } from '@/lib/officeContext';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { loadClientsLite } from '@/lib/loadClientsLite';
import type { ClientLite } from '@/lib/types';
import { applyChecklistTemplate } from '@/lib/checklist';
import { CHECKLIST_TEMPLATES } from '@/lib/checklistTemplates';

type CaseRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  client_id: string | null;
  client?: { name: string } | null;
  process_number: string | null;
  area: string | null;
  responsible_user_id: string | null;
};

function getStatusLabel(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'peticao_inicial') return 'Petição Inicial';
  if (s === 'citacao_defesa') return 'Citação e Defesa';
  if (s === 'instrucao_provas') return 'Instrução e Provas';
  if (s === 'julgamento_sentenca') return 'Sentença';
  if (s === 'recurso') return 'Recurso';
  if (s === 'execucao_recebimento') return 'Execução / Fim';
  if (s === 'arquivado') return 'Arquivado';
  return status;
}

function statusBadge(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'peticao_inicial' || s === 'citacao_defesa' || s === 'instrucao_provas') return 'badge badge-gold';
  return 'badge';
}

export function CasesPage() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [params, setParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [role, setRole] = useState<string>('');
  const [members, setMembers] = useState<OfficeMemberProfile[]>([]);

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState('peticao_inicial');
  const [newClientIds, setNewClientIds] = useState<string[]>([]);
  const [newProcessNumber, setNewProcessNumber] = useState('');
  const [newArea, setNewArea] = useState('');
  const [saving, setSaving] = useState(false);

  // Checklist prompt after case creation
  const [checklistModalCaseId, setChecklistModalCaseId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('usucapiao');
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const ordered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;

    if (statusFilter !== 'all') {
      out = out.filter((r) => (r.status || '').toLowerCase().includes(statusFilter.toLowerCase()));
    }

    if (role === 'admin' && responsibleFilter !== 'all') {
      out = out.filter((r) => (r.responsible_user_id || '') === responsibleFilter);
    }

    if (needle) {
      out = out.filter((r) => {
        const s = `${r.title} ${r.process_number || ''} ${r.area || ''} ${r.client?.name || ''}`.toLowerCase();
        return s.includes(needle);
      });
    }

    return out;
  }, [rows, q, statusFilter, role, responsibleFilter]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const [{ data: casesData, error: qErr }, clientsLite] = await Promise.all([
        sb
          .from('cases')
          .select('id,title,status,created_at,client_id,process_number,area,responsible_user_id, client:clients!cases_client_id_fkey(name)')
          .order('created_at', { ascending: false }),
        loadClientsLite().catch(() => [] as ClientLite[]),
      ]);

      if (qErr) throw new Error(qErr.message);
      setRows((casesData || []) as any);
      setClients(clientsLite);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar casos.');
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await load();

      // role/members
      const r = await getMyOfficeRole().catch(() => '');
      setRole(r);
      if (r === 'admin') {
        const officeId = await getMyOfficeId().catch(() => null);
        if (officeId) {
          const ms = await listOfficeMemberProfiles(officeId).catch(() => []);
          setMembers(ms);
        }
      }

      // allow deep link: /app/casos?new=1&clientId=...
      const wantNew = params.get('new') === '1';
      const clientId = params.get('clientId') || '';
      if (wantNew) {
        setCreateOpen(true);
        if (clientId) setNewClientIds([clientId]);
        // cleanup URL
        params.delete('new');
        params.delete('clientId');
        setParams(params, { replace: true });
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate() {
    if (!newTitle.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

      // Ensure we have a primary client_id for the legacy column, if needed.
      const primaryClientId = newClientIds.length > 0 ? newClientIds[0] : null;

      const { data: createdCase, error: iErr } = await sb.from('cases').insert({
        user_id: user.id,
        title: newTitle.trim(),
        status: newStatus.trim() || 'aberto',
        client_id: primaryClientId,
        process_number: newProcessNumber.trim() || null,
        area: newArea.trim() || null,
      } as any).select('id').single();

      if (iErr) throw new Error(iErr.message);

      if (newClientIds.length > 0) {
        const caseClients = newClientIds.map(cid => ({
          case_id: createdCase.id,
          client_id: cid
        }));
        await sb.from('case_clients').insert(caseClients as any);
      }

      setCreateOpen(false);
      setNewTitle('');
      setNewStatus('aberto');
      setNewClientIds([]);
      setNewProcessNumber('');
      setNewArea('');
      setSaving(false);
      await load();

      // Prompt to apply a checklist template
      setChecklistModalCaseId(createdCase.id);
    } catch (err: any) {
      setError(err?.message || 'Falha ao criar caso.');
      setSaving(false);
    }
  }

  async function onApplyTemplate() {
    if (!checklistModalCaseId) return;
    setApplyingTemplate(true);
    try {
      await applyChecklistTemplate(checklistModalCaseId, selectedTemplate);
    } catch {
      // template apply failure is non-blocking — case was already created
    }
    setApplyingTemplate(false);
    setChecklistModalCaseId(null);
  }

  return (
    <div className="space-y-6">
      {/* Checklist and Task Playbook template prompt modal */}
      {checklistModalCaseId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-sky-400/25 bg-slate-950 shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/25 text-sky-300 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Deseja aplicar um Playbook?</div>
                <div className="text-xs text-white/50">Cria o checklist de documentos do cliente e gera as tarefas do advogado.</div>
              </div>
            </div>

            <label className="text-sm text-white/80 block">
              Modelo de Playbook / Checklist
              <select
                className="select mt-1"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {Object.entries(CHECKLIST_TEMPLATES).map(([key, tpl]) => (
                  <option key={key} value={key}>{tpl.name}</option>
                ))}
              </select>
            </label>

            <div className="text-xs text-white/50 font-bold uppercase tracking-wider">Itens e Tarefas inclusas:</div>
            <div className="bg-white/5 rounded-xl border border-white/5 p-3 max-h-40 overflow-y-auto space-y-2">
              <div className="space-y-1">
                <div className="text-[10px] text-amber-300 font-bold">Documentos do Cliente:</div>
                {CHECKLIST_TEMPLATES[selectedTemplate]?.items.map((item, i) => (
                  <div key={i} className="text-[11px] text-white/60 flex items-start gap-2 pl-2">
                    <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
              {CHECKLIST_TEMPLATES[selectedTemplate]?.tasks && (
                <div className="space-y-1 pt-1 border-t border-white/5">
                  <div className="text-[10px] text-sky-300 font-bold">Tarefas do Advogado:</div>
                  {CHECKLIST_TEMPLATES[selectedTemplate]?.tasks?.map((task, i) => (
                    <div key={i} className="text-[11px] text-white/60 flex items-start gap-2 pl-2">
                      <span className="text-sky-400 mt-0.5 shrink-0">•</span>
                      <span>{task.title} (vence em {task.daysToDue}d)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                disabled={applyingTemplate}
                onClick={() => void onApplyTemplate()}
                className="btn-primary"
              >
                {applyingTemplate ? 'Aplicando...' : 'Aplicar Playbook'}
              </button>
              <button
                disabled={applyingTemplate}
                onClick={() => setChecklistModalCaseId(null)}
                className="btn-ghost"
              >
                Pular por agora
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader
        icon={Scale}
        eyebrow="Jurídico"
        title="Casos"
        subtitle="Gestão de processos, fases jurídicas e responsáveis."
        actions={
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo caso
          </button>
        }
      />

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
                <select className="select mt-1 w-full" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="peticao_inicial">Petição Inicial (Protocolo)</option>
                  <option value="citacao_defesa">Citação do Réu e Defesa</option>
                  <option value="instrucao_provas">Instrução e Provas</option>
                  <option value="julgamento_sentenca">Julgamento (Sentença)</option>
                  <option value="recurso">Recurso ao Tribunal</option>
                  <option value="execucao_recebimento">Execução e Recebimento (Final)</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </label>
              <label className="text-sm text-white/80">
                Número do processo (CNJ)
                <input className="input" value={newProcessNumber} onChange={(e) => setNewProcessNumber(e.target.value)} />
              </label>
              <label className="text-sm text-white/80">
                Área
                <input className="input" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="Ex.: Previdenciário" />
              </label>
              <label className="md:col-span-2 text-sm text-white/80">
                Clientes Vinculados
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex flex-wrap gap-2">
                    {newClientIds.map((cid) => {
                      const cName = clients.find(c => c.id === cid)?.name || 'Desconhecido';
                      return (
                        <div key={cid} className="flex items-center gap-1 bg-white/10 rounded-md px-2 py-1 text-xs">
                          {cName}
                          <button type="button" onClick={() => setNewClientIds(prev => prev.filter(x => x !== cid))} className="text-red-300 ml-1 hover:text-red-100">x</button>
                        </div>
                      )
                    })}
                  </div>
                  <select 
                    className="select" 
                    value="" 
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && !newClientIds.includes(val)) {
                        setNewClientIds(prev => [...prev, val]);
                      }
                    }}
                  >
                    <option value="">Adicionar cliente...</option>
                    {clients.filter(c => !newClientIds.includes(c.id)).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Lista de casos</div>
            <div className="text-xs text-white/60">Busque por título, CNJ, cliente ou área.</div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="input !mt-0 !text-sm"
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className="select !mt-0 !text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos status</option>
              <option value="aberto">Abertos</option>
              <option value="and">Em andamento</option>
              <option value="encerr">Encerrados</option>
            </select>
            {role === 'admin' ? (
              <select
                className="select !mt-0 !text-sm"
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
              >
                <option value="all">Todos responsáveis</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name || m.email || m.user_id}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
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
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((c) => (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="px-4 py-3 font-medium text-white">
                        <div>
                          <div>{c.title}</div>
                          <div className="mt-1 text-xs text-white/50">
                            {c.process_number ? `CNJ: ${c.process_number}` : 'CNJ: —'}{c.area ? ` · ${c.area}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{c.client?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={statusBadge(c.status)}>{getStatusLabel(c.status)}</span>
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
                      <td className="px-4 py-6 text-sm text-white/60" colSpan={4}>
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
                    <div>
                      <div className="text-sm font-semibold text-white">{c.title}</div>
                      <div className="mt-1 text-xs text-white/60">{c.client?.name || '—'}</div>
                      <div className="mt-1 text-xs text-white/50">
                        {c.process_number ? `CNJ: ${c.process_number}` : 'CNJ: —'}{c.area ? ` · ${c.area}` : ''}
                      </div>
                    </div>
                    <span className={statusBadge(c.status)}>{getStatusLabel(c.status)}</span>
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
        </div>
      </Card>
    </div>
  );
}
