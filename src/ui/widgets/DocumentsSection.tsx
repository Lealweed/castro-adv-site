import { useEffect, useMemo, useState, useRef } from 'react';
import { Eye, EyeOff, FileText, Upload, Download, Trash2, Check, X, History, Folder, Calendar, AlertCircle, Plus, FileUp } from 'lucide-react';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';

import type { DocumentRow } from '@/lib/documents';
import { deleteDocument, getDocumentDownloadUrl, listClientDocuments, uploadClientDocument, toggleDocumentVisibility } from '@/lib/documents';
import { requireSupabase, getAuthedUser } from '@/lib/supabaseDb';
import { getMyOfficeRole } from '@/lib/roles';
import { listCaseChecklistItems, createChecklistItem, applyChecklistTemplate, deleteChecklistItem, updateChecklistItem, reviewChecklistItem } from '@/lib/checklist';
import type { ChecklistItemRow } from '@/lib/checklist';

const CATEGORIES = [
  { value: 'identity', label: 'Identificação (RG/CPF/CNH)', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
  { value: 'address', label: 'Residência/Endereço', color: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
  { value: 'property', label: 'Bens e Imóveis', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { value: 'finance', label: 'Financeiro/Renda', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'evidence', label: 'Provas e Fotos', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  { value: 'other', label: 'Outros/Diversos', color: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20' },
];

function buildAutoTitle(clientName: string, categoryValue: string, date = new Date()): string {
  if (!clientName) return '';
  const firstName = clientName.split(' ')[0];
  const cat = CATEGORIES.find(c => c.value === categoryValue);
  const categoryLabel = cat ? cat.label : categoryValue;
  const d = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${firstName} - ${categoryLabel} - ${d}`;
}

export function DocumentsSection({ clientId, caseId }: { clientId: string; caseId?: string | null }) {
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<'all' | 'checklist' | 'personal' | 'case' | 'template'>(caseId ? 'checklist' : 'all');
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [type, setType] = useState<'all' | 'pdf' | 'image' | 'doc' | 'other'>('all');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadChecklistItemId, setUploadChecklistItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [bulkDone, setBulkDone] = useState(0);
  const [docCategory, setDocCategory] = useState('other');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [clientData, setClientData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Checklist creation & action UI states
  const [showAddChecklistItem, setShowAddChecklistItem] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistDesc, setNewChecklistDesc] = useState('');
  const [newChecklistDueDate, setNewChecklistDueDate] = useState('');
  
  const [showApplyTemplate, setShowApplyTemplate] = useState(false);
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [internalComments, setInternalComments] = useState('');

  // Version history popover / modal state
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentRow[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        // Only active documents in main list
        if (!r.is_active) return false;
        
        if (tab === 'personal') return r.kind === 'personal';
        if (tab === 'template') return r.kind === 'template';
        if (tab === 'case') {
          if (caseId) return r.kind === 'case' && r.case_id === caseId;
          return r.kind === 'case';
        }
        return true;
      })
      .filter((r) => {
        if (selectedCategory === 'all') return true;
        return r.category === selectedCategory;
      })
      .filter((r) => {
        const mt = String(r.mime_type || '').toLowerCase();
        if (type === 'all') return true;
        if (type === 'pdf') return mt.includes('pdf') || r.file_path.toLowerCase().endsWith('.pdf');
        if (type === 'image') return mt.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(r.file_path);
        if (type === 'doc') return /\.(doc|docx)$/i.test(r.file_path) || mt.includes('msword');
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        const hay = [r.title, r.mime_type || '', r.file_path].join(' ').toLowerCase();
        return hay.includes(term);
      });
  }, [rows, tab, caseId, selectedCategory, q, type]);

  async function loadChecklist() {
    if (!caseId) return;
    setLoadingChecklist(true);
    try {
      const data = await listCaseChecklistItems(caseId);
      setChecklist(data);
    } catch (err: any) {
      console.error('Erro checklist:', err);
    } finally {
      setLoadingChecklist(false);
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listClientDocuments(clientId);
      setRows(data);
      
      const sb = requireSupabase();
      const user = await getAuthedUser();
      setUserId(user.id);
      
      const role = await getMyOfficeRole().catch(() => '');
      setIsAdmin(role === 'admin');
      
      const { data: cData } = await sb.from('clients').select('*').eq('id', clientId).single();
      if (cData) setClientData(cData);
      
      if (caseId) {
        await loadChecklist();
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar documentos.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, caseId]);

  async function onUpload() {
    if (files.length === 0) return;
    setSaving(true);
    setBulkDone(0);
    setError(null);
    try {
      const kind = tab === 'template' ? 'template' : (caseId ? 'case' : 'personal');
      const isBulk = files.length > 1 && !uploadChecklistItemId;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];

        let versionNum = 1;
        let parentId: string | null = null;

        if (uploadChecklistItemId) {
          const activeDoc = rows.find(r => r.checklist_item_id === uploadChecklistItemId && r.is_active);
          if (activeDoc) {
            parentId = activeDoc.parent_id || activeDoc.id;
            versionNum = (activeDoc.version_number || 1) + 1;
          }
        }

        const docTitle = isBulk
          ? (clientData?.name ? `${buildAutoTitle(clientData.name, docCategory)} (${i + 1})` : f.name)
          : (title.trim() || f.name);

        await uploadClientDocument({
          clientId,
          kind,
          title: docTitle,
          file: f,
          caseId: caseId || null,
          isPublic: kind === 'template' ? false : isPublic,
          category: docCategory,
          checklistItemId: uploadChecklistItemId || null,
          parentId,
          versionNumber: versionNum,
          replacementReason: parentId ? 'Atualização de documento pelo escritório' : null,
        });

        // If linked to checklist, automatically mark as approved since uploaded by lawyer
        if (uploadChecklistItemId) {
          await updateChecklistItem(uploadChecklistItemId, { status: 'approved' });
        }

        setBulkDone(i + 1);
      }

      setUploadOpen(false);
      setUploadChecklistItemId(null);
      setTitle('');
      setTitleEdited(false);
      setFiles([]);
      setBulkDone(0);
      setIsPublic(false);
      setDocCategory('other');
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar documento.');
      setSaving(false);
    }
  }

  function handleCategoryChange(newCategory: string) {
    setDocCategory(newCategory);
    if (!titleEdited && clientData?.name) {
      setTitle(buildAutoTitle(clientData.name, newCategory));
    }
  }

  async function handleAddChecklist() {
    if (!caseId || !newChecklistTitle.trim()) return;
    setSaving(true);
    try {
      await createChecklistItem({
        caseId,
        title: newChecklistTitle,
        description: newChecklistDesc,
        dueDate: newChecklistDueDate || null,
      });
      setNewChecklistTitle('');
      setNewChecklistDesc('');
      setNewChecklistDueDate('');
      setShowAddChecklistItem(false);
      await loadChecklist();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyTemplate(key: string) {
    if (!caseId) return;
    setSaving(true);
    try {
      await applyChecklistTemplate(caseId, key);
      setShowApplyTemplate(false);
      await loadChecklist();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReviewChecklist() {
    if (!reviewItemId || !reviewAction) return;
    setSaving(true);
    try {
      await reviewChecklistItem(reviewItemId, reviewAction, reviewComment, internalComments);
      setReviewItemId(null);
      setReviewAction(null);
      setReviewComment('');
      setInternalComments('');
      await load();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function loadVersions(doc: DocumentRow) {
    setHistoryDocId(doc.id);
    setLoadingVersions(true);
    try {
      const sb = requireSupabase();
      const parentId = doc.parent_id || doc.id;
      // Get all documents with this parentId or the parent document itself
      const { data, error } = await sb
        .from('documents')
        .select('*')
        .or(`parent_id.eq.${parentId},id.eq.${parentId}`)
        .order('version_number', { ascending: false });
      
      if (error) throw new Error(error.message);
      setVersions((data || []) as DocumentRow[]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function onTogglePublic(doc: DocumentRow) {
    try {
      await toggleDocumentVisibility(doc.id, !doc.is_public);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao alterar visibilidade.');
    }
  }

  async function generateFromTemplate(doc: DocumentRow) {
    if (!clientData) {
      alert("Faltam dados do cliente para preencher o modelo.");
      return;
    }
    
    setSaving(true);
    setError("Gerando documento... Aguarde.");
    try {
      const url = await getDocumentDownloadUrl(doc.file_path, doc.id);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao baixar o modelo.");
      
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const zip = new PizZip(arrayBuffer);
      const docx = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      
      docx.render({
        nome_cliente: clientData.name || '',
        telefone: clientData.phone || '',
        email: clientData.email || '',
        cpf: clientData.cpf || '',
        data_atual: new Date().toLocaleDateString('pt-BR'),
        id_cliente: clientData.id.slice(0, 8),
      });
      
      const out = docx.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      const generatedFileName = `${doc.title}_${clientData.name.split(' ')[0]}.docx`.replace(/\s+/g, '_');
      
      if (confirm("Documento gerado com sucesso! Deseja salvar uma cópia no painel do cliente automaticamente?")) {
        await uploadClientDocument({
          clientId,
          kind: 'personal',
          title: generatedFileName,
          file: out,
          fileName: generatedFileName,
          isPublic: false,
          category: 'other',
        });
        await load();
      }
      
      saveAs(out, generatedFileName);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao gerar documento. O arquivo não é um .docx válido ou as chaves estão mal formatadas.');
    } finally {
      setSaving(false);
    }
  }

  async function onDownload(doc: DocumentRow) {
    try {
      const url = await getDocumentDownloadUrl(doc.file_path, doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err?.message || 'Falha ao gerar link de download.');
    }
  }

  async function onDelete(doc: DocumentRow) {
    if (!confirm('Excluir este documento? Esta ação não pode ser desfeita.')) return;
    try {
      await deleteDocument({ id: doc.id, file_path: doc.file_path });
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao excluir documento.');
    }
  }

  async function handleChecklistItemDelete(itemId: string) {
    if (!confirm('Excluir este item do checklist?')) return;
    try {
      await deleteChecklistItem(itemId);
      await loadChecklist();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-400" />
            Smart Drive & Checklists
          </div>
          <div className="text-xs text-white/50">Versionamento de arquivos, checklists de processos e automação.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            {(
              [
                ...(caseId ? [{ id: 'checklist', label: 'Checklist Caso' }] : []),
                { id: 'all', label: 'Todos Docs' },
                { id: 'personal', label: 'Pessoais' },
                { id: 'case', label: 'Processuais' },
                { id: 'template', label: 'Modelos Word' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ' +
                  (tab === t.id ? 'bg-amber-400 text-neutral-950 shadow-md shadow-amber-400/20 scale-[1.02]' : 'text-white/70 hover:text-white')
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setUploadChecklistItemId(null);
              setTitleEdited(false);
              setTitle(clientData?.name ? buildAutoTitle(clientData.name, docCategory) : '');
              setUploadOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Enviar Arquivo
          </button>
        </div>
      </div>

      {error ? (
        <div className={`text-sm p-4 rounded-xl border flex items-center gap-3 animate-fadeIn ${error.includes('Aguarde') || error.includes('gerado') ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-red-500/10 border-red-500/20 text-red-200'}`}>
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">Fechar</button>
        </div>
      ) : null}

      {/* Checklist View */}
      {tab === 'checklist' && caseId && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Pendências e Documentação do Processo</h3>
              <p className="text-xs text-white/50">Crie checklists obrigatórios para que o cliente envie pelo Portal VIP.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setShowApplyTemplate(!showApplyTemplate);
                  setShowAddChecklistItem(false);
                }}
                className="btn-ghost !border-white/10 !text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Carregar Modelo
              </button>
              
              <button 
                onClick={() => {
                  setShowAddChecklistItem(!showAddChecklistItem);
                  setShowApplyTemplate(false);
                }}
                className="btn-ghost !border-white/10 !text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Criar Item
              </button>
            </div>
          </div>

          {showApplyTemplate && (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-2 animate-slideDown">
              <button onClick={() => handleApplyTemplate('usucapiao')} className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors">
                🏠 Usucapião Extrajudicial
              </button>
              <button onClick={() => handleApplyTemplate('divorcio')} className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors">
                💔 Divórcio Consensual
              </button>
              <button onClick={() => handleApplyTemplate('trabalhista_empresa')} className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors">
                💼 Defesa Trabalhista
              </button>
              <button onClick={() => handleApplyTemplate('alimentos')} className="text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors">
                👶 Ação de Alimentos
              </button>
            </div>
          )}

          {showAddChecklistItem && (
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3 animate-slideDown">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Novo Item de Checklist</h4>
              <div className="grid gap-3 md:grid-cols-3">
                <input className="input !text-sm" placeholder="Título (Ex: RG do Requerente)" value={newChecklistTitle} onChange={(e) => setNewChecklistTitle(e.target.value)} />
                <input className="input !text-sm" placeholder="Instruções ou Descrição" value={newChecklistDesc} onChange={(e) => setNewChecklistDesc(e.target.value)} />
                <input className="input !text-sm" type="date" value={newChecklistDueDate} onChange={(e) => setNewChecklistDueDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddChecklist} className="btn-primary !text-xs" disabled={saving || !newChecklistTitle.trim()}>Adicionar</button>
                <button onClick={() => setShowAddChecklistItem(false)} className="btn-ghost !text-xs">Cancelar</button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-neutral-900/30 overflow-hidden divide-y divide-white/5">
            {loadingChecklist ? (
              <div className="p-8 text-center text-sm text-white/50">Carregando checklist...</div>
            ) : checklist.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/40">
                Nenhum requisito de documento configurado para este caso.
                <button onClick={() => setShowApplyTemplate(true)} className="block mx-auto mt-2 text-xs text-amber-400 hover:underline">Carregar um modelo padrão</button>
              </div>
            ) : (
              checklist.map((item) => {
                const linkedDoc = rows.find(r => r.checklist_item_id === item.id && r.is_active);
                
                return (
                  <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        {item.due_date && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-white/60 border border-white/10 rounded px-1.5 py-0.5">
                            <Calendar className="w-3 h-3" /> Limite: {new Date(item.due_date).toLocaleDateString()}
                          </span>
                        )}
                        
                        {item.status === 'approved' && <span className="badge bg-emerald-500/10 text-emerald-300 border-emerald-500/20">Aprovado</span>}
                        {item.status === 'under_analysis' && <span className="badge bg-blue-500/10 text-blue-300 border-blue-500/20">Em Análise</span>}
                        {item.status === 'rejected' && <span className="badge bg-red-500/10 text-red-300 border-red-500/20">Rejeitado</span>}
                        {item.status === 'pending' && <span className="badge bg-zinc-500/10 text-zinc-400 border-white/10">Pendente</span>}
                        {item.status === 'forwarded' && <span className="badge bg-purple-500/10 text-purple-300 border-purple-500/20">📤 Enc. ao Cartório</span>}
                        {item.status === 'filed' && <span className="badge bg-teal-500/10 text-teal-300 border-teal-500/20">📁 Protocolado</span>}
                      </div>

                      {item.description && <p className="text-xs text-white/60">{item.description}</p>}
                      {item.status === 'rejected' && item.rejection_reason && (
                        <p className="text-xs text-red-300 bg-red-500/5 border border-red-500/10 rounded-lg p-2 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span><strong>Motivo de correção:</strong> {item.rejection_reason}</span>
                        </p>
                      )}

                      {/* Display Uploaded Document Details */}
                      {linkedDoc && (
                        <div className="mt-2 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2 text-xs">
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span className="text-white truncate max-w-[200px] md:max-w-xs">{linkedDoc.title}</span>
                          <span className="text-white/40">({(linkedDoc.size_bytes ? linkedDoc.size_bytes / 1024 / 1024 : 0).toFixed(2)} MB)</span>
                          <button onClick={() => onDownload(linkedDoc)} className="text-amber-400 hover:underline flex items-center gap-1 font-semibold ml-2">
                            <Download className="w-3.5 h-3.5" /> Baixar
                          </button>

                          {/* Version indicator and button */}
                          {(linkedDoc.version_number && linkedDoc.version_number > 1) ? (
                            <button 
                              onClick={() => loadVersions(linkedDoc)}
                              className="text-white/60 hover:text-white flex items-center gap-1 ml-2 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg transition-colors border border-white/5"
                            >
                              <History className="w-3 h-3 text-sky-400" /> v{linkedDoc.version_number}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {/* Review actions if doc is uploaded and under analysis */}
                      {linkedDoc && item.status === 'under_analysis' && (
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                          <button 
                            onClick={() => {
                              setReviewItemId(item.id);
                              setReviewAction('approved');
                            }}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                            title="Aprovar Documento"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setReviewItemId(item.id);
                              setReviewAction('rejected');
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Solicitar Correção / Rejeitar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Internal status advance: forwarded / filed (only for approved items) */}
                      {(item.status === 'approved' || item.status === 'forwarded') && (
                        <div className="flex items-center gap-1">
                          {item.status === 'approved' && (
                            <button
                              onClick={() => void updateChecklistItem(item.id, { status: 'forwarded' }).then(() => load())}
                              className="btn-ghost !border-purple-500/20 !text-purple-300 !text-[10px] !py-1 !px-2"
                              title="Marcar como Encaminhado ao Cartório"
                            >
                              📤 Enc. Cartório
                            </button>
                          )}
                          {(item.status === 'approved' || item.status === 'forwarded') && (
                            <button
                              onClick={() => void updateChecklistItem(item.id, { status: 'filed' }).then(() => load())}
                              className="btn-ghost !border-teal-500/20 !text-teal-300 !text-[10px] !py-1 !px-2"
                              title="Marcar como Protocolado"
                            >
                              📁 Protocolado
                            </button>
                          )}
                        </div>
                      )}

                      {/* Upload/Replace document buttons */}
                      <button 
                        onClick={() => {
                          setUploadChecklistItemId(item.id);
                          setTitleEdited(true);
                          setTitle(item.title);
                          setUploadOpen(true);
                        }}
                        className="btn-ghost !border-white/10 !text-xs !py-1.5 flex items-center gap-1"
                        title={linkedDoc ? "Substituir por Nova Versão" : "Enviar Documento"}
                      >
                        <FileUp className="w-3.5 h-3.5" /> {linkedDoc ? 'Substituir' : 'Enviar'}
                      </button>

                      <button 
                        onClick={() => handleChecklistItemDelete(item.id)}
                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remover Requisito"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Review Dialog Inline Modal */}
      {reviewItemId && reviewAction && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 relative animate-fadeIn">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
          <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            {reviewAction === 'approved' ? 'Confirmar Aprovação do Documento' : 'Solicitar Correção do Documento'}
          </h4>
          
          <div className="grid gap-3">
            {reviewAction === 'rejected' && (
              <label className="text-xs text-white/80 block">
                Motivo da Rejeição / O que precisa ser corrigido:
                <textarea 
                  className="input mt-1 min-h-[80px]"
                  placeholder="Ex: A foto ficou tremida e o CPF está ilegível. Por favor envie novamente com boa iluminação."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </label>
            )}

            <label className="text-xs text-white/80 block">
              Comentários Internos (visível apenas para advogadas):
              <input 
                className="input mt-1"
                placeholder="Ex: CPF validado no site da Receita Federal."
                value={internalComments}
                onChange={(e) => setInternalComments(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button 
              disabled={saving}
              onClick={handleReviewChecklist} 
              className={`btn-primary !text-xs ${reviewAction === 'rejected' ? '!bg-red-500 hover:!bg-red-600' : ''}`}
            >
              {saving ? 'Atualizando...' : reviewAction === 'approved' ? 'Aprovar Documento' : 'Solicitar Ajustes'}
            </button>
            <button 
              onClick={() => {
                setReviewItemId(null);
                setReviewAction(null);
              }}
              className="btn-ghost !text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* General File Browser Filters */}
      {tab !== 'checklist' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                className="input w-72 max-w-full !mt-0 !text-sm"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar documento..."
              />
              
              <select 
                className="select w-44 !mt-0 !text-sm" 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Todas Categorias</option>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label.split(' ')[0]}</option>
                ))}
              </select>

              <select 
                className="select w-36 !mt-0 !text-sm" 
                value={type} 
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="all">Tipos</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word</option>
                <option value="image">Imagens</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">{filtered.length} arquivos ativos</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-900/30">
            {loading ? <div className="p-8 text-center text-sm text-white/50 animate-pulse">Carregando documentos...</div> : null}

            {!loading && filtered.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-white/10 mb-3" />
                <div className="text-sm text-white/60">Nenhum documento encontrado.</div>
                <div className="text-xs text-white/40 mt-1">Envie novos arquivos clicando em "Enviar Arquivo" acima.</div>
              </div>
            ) : null}

            {!loading && filtered.length ? (
              <div className="divide-y divide-white/5">
                {filtered.map((d) => {
                  const isWord = d.mime_type?.includes('word') || d.file_path.endsWith('.docx');
                  const catInfo = CATEGORIES.find(c => c.value === d.category);
                  
                  return (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-all">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-1">
                          {isWord ? (
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/10">W</div>
                          ) : d.mime_type?.includes('pdf') ? (
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/10">PDF</div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/10">IMG</div>
                          )}
                        </div>
                        
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md flex items-center gap-2" title={d.title}>
                            {d.title}
                            {d.category && catInfo && (
                              <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 ${catInfo.color}`}>
                                {catInfo.label.split(' ')[0]}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-1 flex items-center gap-3 text-xs text-white/50 flex-wrap">
                            <span>{new Date(d.created_at).toLocaleDateString()}</span>
                            {d.size_bytes ? <span>· {(d.size_bytes / 1024 / 1024).toFixed(2)} MB</span> : null}
                            
                            {d.kind === 'template' ? (
                              <span className="badge border-blue-500/30 bg-blue-500/10 text-blue-300">Modelo</span>
                            ) : d.is_public ? (
                              <span className="flex items-center gap-1 text-emerald-400" title="Cliente pode ver no portal"><Eye className="w-3.5 h-3.5" /> Público</span>
                            ) : (
                              <span className="flex items-center gap-1 text-white/40" title="Interno"><EyeOff className="w-3.5 h-3.5" /> Interno</span>
                            )}

                            {d.status === 'under_analysis' && <span className="text-blue-400">● Em Análise</span>}
                            {d.status === 'approved' && <span className="text-emerald-400">● Aprovado</span>}
                            {d.status === 'rejected' && <span className="text-red-400">● Rejeitado</span>}
                            {d.status === 'forwarded' && <span className="text-purple-400">● Enc. ao Cartório</span>}
                            {d.status === 'filed' && <span className="text-teal-400">● Protocolado</span>}

                            {/* Version history loader */}
                            {(d.version_number && d.version_number > 1) ? (
                              <button 
                                onClick={() => loadVersions(d)}
                                className="inline-flex items-center gap-1 text-sky-400 hover:underline bg-sky-500/5 border border-sky-500/10 rounded px-1.5 py-0.2"
                              >
                                <History className="w-3 h-3" /> v{d.version_number} (Histórico)
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {d.kind === 'template' && isWord ? (
                          <button 
                            onClick={() => void generateFromTemplate(d)} 
                            disabled={saving}
                            className="btn-primary !rounded-lg !px-3 !py-1.5 !text-xs whitespace-nowrap"
                          >
                            ⚡ Gerar Doc
                          </button>
                        ) : null}
                      
                        {d.kind !== 'template' ? (
                          <button 
                            onClick={() => void onTogglePublic(d)} 
                            className="btn-ghost !border-white/10 !rounded-lg !px-3 !py-1.5 !text-xs"
                          >
                            {d.is_public ? 'Ocultar' : 'Publicar'}
                          </button>
                        ) : null}
                        
                        <button onClick={() => void onDownload(d)} className="btn-ghost !rounded-lg !p-2" title="Baixar">
                          <Download className="w-4 h-4 text-white/70" />
                        </button>
                        
                        {isAdmin && (d.kind !== 'template' || d.user_id === userId) ? (
                          <button onClick={() => void onDelete(d)} className="btn-ghost !border-transparent hover:!bg-red-500/10 hover:!text-red-400 !rounded-lg !p-2 group" title="Excluir">
                            <Trash2 className="w-4 h-4 text-white/30 group-hover:text-red-400" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Upload Dialog Container */}
      {uploadOpen ? (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <h3 className="text-sm font-semibold text-white mb-4">
            {uploadChecklistItemId ? 'Enviar Documento para Requisito' : 'Adicionar Documento ao Drive'}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Categoria do Documento
              <select className="select" value={docCategory} onChange={(e) => handleCategoryChange(e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>

            {/* Title field — hidden in bulk mode (auto-named per file) */}
            {(files.length <= 1 || !!uploadChecklistItemId) && (
            <label className="text-sm text-white/80">
              Nome de exibição
              <input
                className="input"
                value={title}
                onChange={(e) => { setTitleEdited(true); setTitle(e.target.value); }}
                placeholder={clientData?.name ? buildAutoTitle(clientData.name, docCategory) : 'Ex: CNH do Cliente'}
              />
              {!titleEdited && clientData?.name && (
                <span className="text-[10px] text-white/40 mt-1 block">✦ Gerado automaticamente — edite se necessário</span>
              )}
            </label>
            )}

            <div>
              <label className="text-sm text-white/80 block mb-1">
                {uploadChecklistItemId ? 'Selecione o arquivo' : (tab === 'template' ? 'Selecione o arquivo' : 'Selecione o(s) arquivo(s)')}
              </label>
              <input
                ref={fileInputRef}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-white/10 rounded-xl bg-black/20"
                type="file"
                multiple={tab !== 'template' && !uploadChecklistItemId}
                onChange={(e) => { setFiles(Array.from(e.target.files ?? [])); setBulkDone(0); }}
                accept={tab === 'template' ? '.docx' : 'application/pdf,image/*,.doc,.docx,.xlsx,.zip'}
              />
              {tab !== 'template' && !uploadChecklistItemId && (
                <p className="text-xs text-white/30 mt-1">PDF, imagem, Word, Excel, ZIP — selecione vários de uma vez.</p>
              )}
            </div>

            {/* Bulk file queue */}
            {files.length > 1 && !uploadChecklistItemId && (
              <div className="col-span-2 space-y-1.5">
                <div className="text-xs text-white/50 font-semibold">{files.length} arquivos na fila:</div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {files.map((f, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${i < bulkDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/5 border-white/5 text-white/70'}`}>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-white/30 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      {i < bulkDone && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress bar for bulk upload */}
            {saving && files.length > 1 && !uploadChecklistItemId && (
              <div className="col-span-2">
                <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                  <span>Enviando {bulkDone} de {files.length}...</span>
                  <span>{Math.round((bulkDone / files.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(bulkDone / files.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {tab !== 'template' && !uploadChecklistItemId && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors col-span-2">
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={(e) => setIsPublic(e.target.checked)} 
                  className="w-4 h-4 text-amber-400 rounded border-white/20 bg-transparent focus:ring-amber-400 focus:ring-offset-gray-900"
                />
                <div>
                  <div className="text-sm font-semibold text-white">Tornar visível para o Cliente</div>
                  <div className="text-xs text-white/50">O cliente poderá ver e baixar este arquivo pelo Portal VIP.</div>
                </div>
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={saving || files.length === 0} onClick={() => void onUpload()} className="btn-primary">
              {saving
                ? (files.length > 1 ? `Enviando ${bulkDone}/${files.length}...` : 'Enviando...')
                : (files.length > 1 ? `Enviar ${files.length} Arquivos` : 'Salvar no Drive')}
            </button>
            <button disabled={saving} onClick={() => { setUploadOpen(false); setUploadChecklistItemId(null); setFiles([]); setBulkDone(0); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {/* Version History Modal */}
      {historyDocId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  Histórico de Versões do Documento
                </h3>
                <p className="text-xs text-white/50">Visualize e baixe versões anteriores enviadas para este item.</p>
              </div>
              <button onClick={() => setHistoryDocId(null)} className="text-white/40 hover:text-white text-sm font-semibold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingVersions ? (
                <div className="p-10 text-center text-sm text-white/50">Carregando histórico...</div>
              ) : (
                versions.map((ver) => (
                  <div 
                    key={ver.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${ver.is_active ? 'bg-white/5 border-white/15' : 'bg-black/40 border-white/5 opacity-70'}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {ver.title}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${ver.is_active ? 'bg-amber-400/10 text-amber-300' : 'bg-white/5 text-white/40'}`}>
                          Versão {ver.version_number} {ver.is_active ? '(Ativa)' : ''}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-white/50">
                        <span>Enviado em: {new Date(ver.created_at).toLocaleString()}</span>
                        {ver.replacement_reason && (
                          <span className="text-sky-300">· Motivo: {ver.replacement_reason}</span>
                        )}
                      </div>
                      
                      {ver.rejection_reason && (
                        <div className="text-[10px] text-red-300 mt-1">Correção: {ver.rejection_reason}</div>
                      )}
                    </div>

                    <button 
                      onClick={() => onDownload(ver)}
                      className="btn-ghost !p-2 !border-white/10 hover:!bg-white/5"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 flex justify-end">
              <button onClick={() => setHistoryDocId(null)} className="btn-primary !text-xs !px-4">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
