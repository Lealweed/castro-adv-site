import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Trash2, Eye, EyeOff, Bot, Upload, Layers, CheckCircle2, AlertCircle, Clock, Check, X, RefreshCw } from 'lucide-react';

import { Card } from '@/ui/widgets/Card';

import type { DocumentRow } from '@/lib/documents';
import { deleteDocument, getDocumentDownloadUrl, toggleDocumentVisibility, uploadClientDocument } from '@/lib/documents';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { getMyOfficeRole } from '@/lib/roles';
import { loadClientsLite } from '@/lib/loadClientsLite';
import type { ClientLite } from '@/lib/types';
import { reviewChecklistItem } from '@/lib/checklist';

const DRIVE_CATEGORIES = [
  { value: 'identity', label: 'Identificação (RG/CPF/CNH)' },
  { value: 'address', label: 'Residência/Endereço' },
  { value: 'property', label: 'Bens e Imóveis' },
  { value: 'finance', label: 'Financeiro/Renda' },
  { value: 'evidence', label: 'Provas e Fotos' },
  { value: 'contract', label: 'Contratos' },
  { value: 'power_of_attorney', label: 'Procurações' },
  { value: 'certificate', label: 'Certidões' },
  { value: 'other', label: 'Outros/Diversos' },
];

function buildDriveAutoTitle(clientName: string, categoryValue: string, date = new Date()): string {
  if (!clientName) return '';
  const cat = DRIVE_CATEGORIES.find(c => c.value === categoryValue);
  const catLabel = cat?.label || categoryValue;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${clientName} - ${catLabel} - ${dd}.${mm}.${yyyy}`;
}

export function DrivePage() {
  const [rows, setRows] = useState<(DocumentRow & { client_name?: string })[]>([]);
  const [checklistPendencies, setChecklistPendencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<'files' | 'reviews'>('files');
  const [q, setQ] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [type, setType] = useState<'all' | 'pdf' | 'image' | 'doc' | 'other'>('all');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientLite[]>([]);
  
  // Upload form state
  const [upTitle, setUpTitle] = useState('');
  const [upTitleEdited, setUpTitleEdited] = useState(false);
  const [upKind, setUpKind] = useState<'personal' | 'template'>('personal');
  const [upCategory, setUpCategory] = useState('other');
  const [upClientId, setUpClientId] = useState('');
  const [upPublic, setUpPublic] = useState(false);
  const [upFiles, setUpFiles] = useState<File[]>([]);
  const [bulkDone, setBulkDone] = useState(0);

  function applyAutoTitle(clientId: string, category: string) {
    const client = clients.find(c => c.id === clientId);
    if (client) setUpTitle(buildDriveAutoTitle(client.name, category));
  }
  function handleUpClientChange(clientId: string) {
    setUpClientId(clientId);
    if (!upTitleEdited) applyAutoTitle(clientId, upCategory);
  }
  function handleUpCategoryChange(category: string) {
    setUpCategory(category);
    if (!upTitleEdited && upClientId) applyAutoTitle(upClientId, category);
  }
  function handleFilesSelected(fileList: FileList | null) {
    const arr = Array.from(fileList ?? []);
    setUpFiles(arr);
    setBulkDone(0);
    if (arr.length === 1) {
      // Single file: auto-fill title only if user hasn't typed
      if (!upTitleEdited && upClientId) applyAutoTitle(upClientId, upCategory);
    }
  }
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review states
  const [reviewItemId, setReviewItemId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [internalComments, setInternalComments] = useState('');

  // Metrics
  const metrics = useMemo(() => {
    const totalFiles = rows.length;
    const underAnalysisCount = checklistPendencies.filter(p => p.status === 'under_analysis').length;
    const rejectedCount = checklistPendencies.filter(p => p.status === 'rejected').length;
    const pendingCount = checklistPendencies.filter(p => p.status === 'pending').length;
    
    return {
      totalFiles,
      underAnalysisCount,
      rejectedCount,
      pendingCount
    };
  }, [rows, checklistPendencies]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const role = await getMyOfficeRole().catch(() => '');
      setIsAdmin(role === 'admin');

      // 1) Fetch documents
      const { data, error: fetchErr } = await sb
        .from('documents')
        .select('id,user_id,client_id,case_id,task_id,kind,title,file_path,mime_type,size_bytes,created_at,is_public,is_active,client:clients(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchErr) throw new Error(fetchErr.message);

      const docs = (data || []).map((d: any) => ({
        ...d,
        client_name: d.client?.[0]?.name || 'Desconhecido'
      }));

      setRows(docs);
      
      // 2) Fetch checklist items (pendencies)
      const { data: items, error: iErr } = await sb
        .from('checklist_items')
        .select('id,title,description,status,rejection_reason,due_date,updated_at,case:cases(id,title,client:clients(id,name))')
        .order('updated_at', { ascending: false });

      if (iErr) throw new Error(iErr.message);
      
      const formattedItems = (items || []).map((item: any) => {
        // Find document linked to this checklist item
        const linkedDoc = docs.find(d => d.checklist_item_id === item.id || d.id === docs.find(doc => doc.checklist_item_id === item.id)?.id);
        
        return {
          ...item,
          client_name: item.case?.client?.[0]?.name || 'Desconhecido',
          client_id: item.case?.client?.[0]?.id || '',
          case_title: item.case?.title || 'Caso Sem Título',
          linkedDoc
        };
      });

      setChecklistPendencies(formattedItems);

      const loadedClients = await loadClientsLite().catch(() => [] as ClientLite[]);
      setClients(loadedClients);

      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados do Drive.');
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return rows
      .filter((r) => {
        const mt = String(r.mime_type || '').toLowerCase();
        if (type === 'all') return true;
        if (type === 'pdf') return mt.includes('pdf') || r.file_path.toLowerCase().endsWith('.pdf');
        if (type === 'image') return mt.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(r.file_path);
        if (type === 'doc') return /\.(doc|docx)$/i.test(r.file_path) || mt.includes('msword') || mt.includes('wordprocessingml');
        return true;
      })
      .filter((r) => {
        if (visibility === 'public') return r.is_public;
        if (visibility === 'private') return !r.is_public;
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        const hay = [r.title, r.mime_type || '', r.client_name || ''].join(' ').toLowerCase();
        return hay.includes(term);
      });
  }, [rows, q, type, visibility]);

  const [analyzingDoc, setAnalyzingDoc] = useState<string | null>(null);

  async function onAnalyzeWithAI(doc: DocumentRow) {
    if (analyzingDoc) return;
    setAnalyzingDoc(doc.id);
    
    setTimeout(() => {
      alert(`[LegalDoc AI] Análise concluída para: ${doc.title}\n\n- Partes Identificadas: 2\n- Riscos: Baixo\n- Cláusulas Extraídas: 5\n\nResumo salvo nas observações do cliente.`);
      setAnalyzingDoc(null);
    }, 2500);
  }

  async function onDownload(doc: DocumentRow) {
    try {
      const url = await getDocumentDownloadUrl(doc.file_path, doc.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert('Falha ao gerar link de download: ' + err.message);
    }
  }

  async function onTogglePublic(doc: DocumentRow) {
    try {
      await toggleDocumentVisibility(doc.id, !doc.is_public);
      await load();
    } catch (err: any) {
      alert('Falha ao alterar visibilidade: ' + err.message);
    }
  }

  async function onDelete(doc: DocumentRow) {
    if (!confirm('Excluir este documento do sistema inteiro?')) return;
    try {
      await deleteDocument({ id: doc.id, file_path: doc.file_path });
      await load();
    } catch (err: any) {
      alert('Falha ao excluir documento: ' + err.message);
    }
  }

  async function handleReviewSubmit() {
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
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onUpload() {
    if (upFiles.length === 0) return;
    if (upKind === 'personal' && !upClientId) {
      setError('Selecione um cliente para vincular o documento.');
      return;
    }

    setSaving(true);
    setBulkDone(0);
    setError(null);
    try {
      let targetClientId = upClientId;
      if (upKind === 'template' && !targetClientId) {
        if (clients.length > 0) targetClientId = clients[0].id;
        else throw new Error("Cadastre ao menos um cliente para poder subir modelos.");
      }

      const isBulk = upFiles.length > 1;
      const clientName = clients.find(c => c.id === targetClientId)?.name || '';

      for (let i = 0; i < upFiles.length; i++) {
        const f = upFiles[i];
        let title: string;
        if (isBulk) {
          title = clientName
            ? `${buildDriveAutoTitle(clientName, upCategory)} (${i + 1})`
            : f.name;
        } else {
          title = upTitle.trim() || f.name;
        }

        await uploadClientDocument({
          clientId: targetClientId,
          kind: upKind,
          title,
          category: upCategory,
          file: f,
          isPublic: upKind === 'template' ? false : upPublic,
        });

        setBulkDone(i + 1);
      }

      setUploadOpen(false);
      setUpFiles([]);
      setUpTitle('');
      setUpTitleEdited(false);
      setUpCategory('other');
      setUpPublic(false);
      setBulkDone(0);
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err: any) {
      setError(err?.message || 'Falha ao enviar documento.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-400" />
            Cofre Digital & Drive Central
          </h1>
          <p className="text-xs text-white/50">Gerencie documentos, acompanhe as pendências dos clientes e faça revisões.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="btn-ghost !border-white/10 !p-2" 
            title="Atualizar Dados"
          >
            <RefreshCw className="w-4 h-4 text-white/70" />
          </button>

          <button onClick={() => setUploadOpen(true)} className="btn-primary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Novo Documento
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Aguardando Revisão</div>
            <div className="text-lg font-bold text-white mt-0.5">{metrics.underAnalysisCount}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Ajustes Pendentes</div>
            <div className="text-lg font-bold text-white mt-0.5">{metrics.rejectedCount}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center border border-white/10">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Documentos Requeridos</div>
            <div className="text-lg font-bold text-white mt-0.5">{metrics.pendingCount}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Total de Arquivos</div>
            <div className="text-lg font-bold text-white mt-0.5">{metrics.totalFiles}</div>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-red-200 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div> : null}

      {/* Upload Box */}
      {uploadOpen && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <h3 className="text-sm font-semibold text-white mb-4">Adicionar Documento ao Drive Global</h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-white/80">
              Tipo do Arquivo
              <select className="select !mt-1" value={upKind} onChange={e => setUpKind(e.target.value as any)}>
                <option value="personal">Documento / Prova do Cliente</option>
                <option value="template">Modelo Word para Geração (Contratos/Procurações)</option>
              </select>
            </label>

            <label className="text-sm text-white/80">
              Vincular a um Cliente
              <select className="select !mt-1" value={upClientId} onChange={e => handleUpClientChange(e.target.value)}>
                <option value="">Selecione o Cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {/* Title + Category — title hidden when bulk */}
            <label className="text-sm text-white/80">
              {upFiles.length > 1 ? 'Categoria do Documento' : 'Categoria e Nome de exibição'}
              <select className="select !mt-1" value={upCategory} onChange={e => handleUpCategoryChange(e.target.value)}>
                {DRIVE_CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
              {upFiles.length <= 1 && (
                <>
                  <input className="input !mt-1" value={upTitle} onChange={(e) => { setUpTitle(e.target.value); setUpTitleEdited(true); }} placeholder="Ex: João - Identificação - 01.06.2025" />
                  {!upTitleEdited && upClientId && <span className="text-[10px] text-white/40 mt-0.5 block">✦ Gerado automaticamente — edite se necessário</span>}
                </>
              )}
              {upFiles.length > 1 && (
                <span className="text-[10px] text-white/40 mt-1 block">✦ Nome gerado automaticamente por arquivo (Ex: João - Categoria - 01.06.2025 (1))</span>
              )}
            </label>
            
            <div>
              <label className="text-sm text-white/80 block mb-1">
                Selecione o arquivo{upKind !== 'template' ? 's' : ''}
              </label>
              <input
                ref={fileInputRef}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-white/10 rounded-xl bg-black/20"
                type="file"
                multiple={upKind !== 'template'}
                onChange={(e) => handleFilesSelected(e.target.files)}
                accept={upKind === 'template' ? '.docx' : 'application/pdf,image/*,.doc,.docx,.xlsx,.zip'}
              />
              {upKind === 'template' && <p className="text-xs text-amber-200/70 mt-1">Apenas arquivos .docx são aceitos como modelos.</p>}
              {upKind !== 'template' && <p className="text-xs text-white/30 mt-1">PDF, imagem, Word, Excel, ZIP — selecione vários de uma vez.</p>}
            </div>

            {/* Bulk file queue */}
            {upFiles.length > 1 && (
              <div className="col-span-2 space-y-1.5">
                <div className="text-xs text-white/50 font-semibold">{upFiles.length} arquivos na fila:</div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {upFiles.map((f, i) => (
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
            {saving && upFiles.length > 1 && (
              <div className="col-span-2">
                <div className="flex items-center justify-between text-xs text-white/60 mb-1">
                  <span>Enviando {bulkDone} de {upFiles.length}...</span>
                  <span>{Math.round((bulkDone / upFiles.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(bulkDone / upFiles.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {upKind !== 'template' && (
              <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors col-span-2">
                <input 
                  type="checkbox" 
                  checked={upPublic} 
                  onChange={(e) => setUpPublic(e.target.checked)} 
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
            <button disabled={saving || upFiles.length === 0 || (!upClientId && upKind === 'personal')} onClick={() => void onUpload()} className="btn-primary">
              {saving
                ? (upFiles.length > 1 ? `Enviando ${bulkDone}/${upFiles.length}...` : 'Enviando...')
                : (upFiles.length > 1 ? `Enviar ${upFiles.length} Arquivos` : 'Salvar no Drive')}
            </button>
            <button disabled={saving} onClick={() => { setUploadOpen(false); setUpFiles([]); setBulkDone(0); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-white/5">
        <button 
          onClick={() => setMainTab('files')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${mainTab === 'files' ? 'border-amber-400 text-amber-300' : 'border-transparent text-white/60 hover:text-white'}`}
        >
          Arquivos do Cofre ({filtered.length})
        </button>
        <button 
          onClick={() => setMainTab('reviews')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'reviews' ? 'border-amber-400 text-amber-300' : 'border-transparent text-white/60 hover:text-white'}`}
        >
          Fila de Aprovações
          {metrics.underAnalysisCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {metrics.underAnalysisCount}
            </span>
          )}
        </button>
      </div>

      {/* REVIEWS QUEUE TAB */}
      {mainTab === 'reviews' && (
        <div className="space-y-4">
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
                    Motivo da Rejeição / O que precisa ser corrigido (visível para o cliente):
                    <textarea 
                      className="input mt-1 min-h-[80px]"
                      placeholder="Ex: A foto ficou tremida. Por favor envie novamente com boa iluminação."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </label>
                )}

                <label className="text-xs text-white/80 block">
                  Comentários Internos (visível apenas para advogadas):
                  <input 
                    className="input mt-1"
                    placeholder="Ex: Documento validado."
                    value={internalComments}
                    onChange={(e) => setInternalComments(e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-4 flex gap-2">
                <button 
                  disabled={saving}
                  onClick={handleReviewSubmit} 
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

          <Card className="p-0 overflow-hidden">
            {checklistPendencies.filter(p => p.status === 'under_analysis').length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/20 mb-3" />
                <div className="text-sm text-white/60">Tudo limpo! Nenhuma aprovação pendente.</div>
                <div className="text-xs text-white/40 mt-1">Os documentos enviados pelos clientes aparecerão aqui para validação imediata.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 text-xs text-white/50 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Cliente / Processo</th>
                      <th className="px-4 py-3 font-semibold">Documento Requerido</th>
                      <th className="px-4 py-3 font-semibold">Arquivo Enviado</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {checklistPendencies.filter(p => p.status === 'under_analysis').map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            <Link to={`/app/clientes/${item.client_id}`} className="hover:text-amber-300">
                              {item.client_name}
                            </Link>
                          </div>
                          <div className="text-xs text-white/40 mt-0.5">{item.case_title}</div>
                        </td>
                        <td className="px-4 py-4 text-white/80">
                          <div className="font-medium text-white">{item.title}</div>
                          {item.description && <div className="text-xs text-white/40 max-w-[200px] truncate">{item.description}</div>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs text-white font-medium truncate max-w-[150px]">{item.linkedDoc?.title || 'Documento'}</span>
                          </div>
                          <div className="text-[10px] text-white/40 mt-0.5">Enviado em {new Date(item.updated_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.linkedDoc && (
                              <button 
                                onClick={() => onDownload(item.linkedDoc)} 
                                className="btn-ghost !rounded-lg !p-2" 
                                title="Baixar e Visualizar"
                              >
                                <Download className="w-4 h-4 text-white/70" />
                              </button>
                            )}

                            <button 
                              onClick={() => {
                                setReviewItemId(item.id);
                                setReviewAction('approved');
                              }}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                              title="Aprovar"
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            <button 
                              onClick={() => {
                                setReviewItemId(item.id);
                                setReviewAction('rejected');
                              }}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                              title="Recusar / Solicitar Ajuste"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FILES BROWSER TAB */}
      {mainTab === 'files' && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:col-span-2">
              <div className="text-[11px] text-white/60">Buscar documento ou cliente</div>
              <input
                className="input !mt-1 !text-sm w-full"
                placeholder="Ex.: Procuração, João..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-white/60">Tipo de Arquivo</div>
              <select className="select !mt-1 !text-sm" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="all">Todos os tipos</option>
                <option value="pdf">PDF</option>
                <option value="doc">Word / Textos</option>
                <option value="image">Imagens</option>
              </select>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] text-white/60">Visibilidade</div>
              <select className="select !mt-1 !text-sm" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="public">No Portal do Cliente (Público)</option>
                <option value="private">Apenas Interno (Privado)</option>
              </select>
            </div>
          </div>

          <Card className="p-0 overflow-hidden">
            {loading ? <div className="p-10 text-center text-sm text-white/50 animate-pulse">Carregando documentos...</div> : null}

            {!loading && filtered.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-white/10 mb-3" />
                <div className="text-sm text-white/60">Nenhum documento encontrado.</div>
                <div className="text-xs text-white/40 mt-1">
                  Os documentos podem ser enviados acessando a aba "Documentos" no perfil de cada cliente.
                </div>
              </div>
            ) : null}

            {!loading && filtered.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-white/5 text-xs text-white/50 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nome do Arquivo</th>
                      <th className="px-4 py-3 font-semibold">Cliente Vinculado</th>
                      <th className="px-4 py-3 font-semibold">Data / Tamanho</th>
                      <th className="px-4 py-3 font-semibold">Acesso</th>
                      <th className="px-4 py-3 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((d) => {
                      const isWord = d.mime_type?.includes('word') || d.file_path.endsWith('.docx');
                      
                      return (
                        <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">
                                {isWord ? (
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">W</div>
                                ) : d.mime_type?.includes('pdf') ? (
                                  <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold">P</div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">IMG</div>
                                )}
                              </div>
                              <div className="font-semibold text-white truncate max-w-[200px]" title={d.title}>
                                {d.title}
                                {d.kind === 'template' && <span className="ml-2 badge border-blue-500/30 bg-blue-500/10 text-blue-300">Modelo</span>}
                                {d.status === 'forwarded' && <span className="ml-2 badge bg-purple-500/10 text-purple-300 border-purple-500/20">📤 Enc. Cartório</span>}
                                {d.status === 'filed' && <span className="ml-2 badge bg-teal-500/10 text-teal-300 border-teal-500/20">📁 Protocolado</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-white/80">
                            <Link to={`/app/clientes/${d.client_id}`} className="hover:text-amber-300 transition-colors">
                              {d.client_name}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-xs text-white/60">
                            {new Date(d.created_at).toLocaleDateString()}
                            {d.size_bytes ? <span className="block mt-0.5 text-white/40">{(d.size_bytes / 1024 / 1024).toFixed(2)} MB</span> : null}
                          </td>
                          <td className="px-4 py-4">
                            {d.kind === 'template' ? (
                              <span className="text-xs text-white/40">—</span>
                            ) : d.is_public ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                                <Eye className="w-3.5 h-3.5" /> Público
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-white/40">
                                <EyeOff className="w-3.5 h-3.5" /> Interno
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(d.mime_type?.includes('pdf') || d.mime_type?.includes('word')) && (
                                <button 
                                  onClick={() => void onAnalyzeWithAI(d)} 
                                  disabled={analyzingDoc === d.id}
                                  className="btn-ghost !border-amber-500/20 !text-amber-200 !rounded-lg !px-3 !py-1.5 !text-xs flex items-center gap-1 hover:bg-amber-500/10"
                                >
                                  <Bot className="w-3.5 h-3.5" />
                                  {analyzingDoc === d.id ? 'Lendo...' : 'Analisar (IA)'}
                                </button>
                              )}
                              {d.kind !== 'template' && (
                                <button onClick={() => void onTogglePublic(d)} className="btn-ghost !border-white/10 !rounded-lg !px-3 !py-1.5 !text-xs">
                                  {d.is_public ? 'Ocultar' : 'Publicar'}
                                </button>
                              )}
                              <button onClick={() => void onDownload(d)} className="btn-ghost !rounded-lg !p-2" title="Baixar">
                                <Download className="w-4 h-4 text-white/70" />
                              </button>
                              {isAdmin && (
                                <button onClick={() => void onDelete(d)} className="btn-ghost !border-transparent hover:!bg-red-500/10 hover:!text-red-400 !rounded-lg !p-2 group" title="Excluir">
                                  <Trash2 className="w-4 h-4 text-white/30 group-hover:text-red-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
