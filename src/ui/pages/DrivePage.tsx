import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Download, Trash2, Eye, EyeOff, Bot, Upload, Layers, CheckCircle2, AlertCircle, Clock, Check, X, RefreshCw, HardDrive, Sparkles, Send, FolderCheck } from 'lucide-react';
import PizZip from 'pizzip';

import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';

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
  const [aiDocModal, setAiDocModal] = useState<{
    docTitle: string;
    clientName: string;
    docType: string;
    sizeKb: number;
    pagesOrWords: string;
    cpfsCnpjs: string[];
    cnjNumbers: string[];
    monetaryValues: string[];
    detectedTerms: string[];
    summaryText: string;
  } | null>(null);

  async function onAnalyzeWithAI(doc: DocumentRow & { client_name?: string }) {
    if (analyzingDoc) return;
    setAnalyzingDoc(doc.id);
    setError(null);

    try {
      const url = await getDocumentDownloadUrl(doc.file_path, doc.id);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Não foi possível baixar o arquivo para análise.');
      const buffer = await resp.arrayBuffer();
      const sizeKb = Math.max(1, Math.round(buffer.byteLength / 1024));
      const isDocx =
        doc.file_path.toLowerCase().endsWith('.docx') ||
        (doc.mime_type || '').toLowerCase().includes('wordprocessingml');

      let extractedText = '';
      let pagesOrWords = '';

      if (isDocx) {
        try {
          const zip = new PizZip(buffer);
          const xml = zip.file('word/document.xml')?.asText() || '';
          extractedText = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const wordCount = extractedText ? extractedText.split(/\s+/).length : 0;
          pagesOrWords = `${wordCount} palavras extraídas (.docx)`;
        } catch {
          extractedText = doc.title;
          pagesOrWords = `${sizeKb} KB (.docx)`;
        }
      } else {
        const rawLatin = new TextDecoder('latin1').decode(buffer);
        const pageMatches = rawLatin.match(/\/Type\s*\/Page\b/g);
        const pageCount = pageMatches ? pageMatches.length : 1;
        const textChunks = rawLatin.match(/\(([^()]{3,200})\)/g) || [];
        extractedText =
          doc.title +
          ' ' +
          textChunks
            .map((s) => s.slice(1, -1))
            .join(' ')
            .replace(/[^\x20-\x7EÀ-ÿ]/g, ' ');
        pagesOrWords = `${pageCount} página(s) estimada(s) (PDF · ${sizeKb} KB)`;
      }

      const combinedSource = `${doc.title} ${extractedText}`;

      const cpfs = Array.from(
        new Set(combinedSource.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) || []),
      ).slice(0, 6);
      const cnjs = Array.from(
        new Set(combinedSource.match(/\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g) || []),
      ).slice(0, 5);
      const moneys = Array.from(
        new Set(combinedSource.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})/g) || []),
      ).slice(0, 6);

      const legalDictionary = [
        { key: 'procuracao', regex: /procura[cç][aã]o|outorgante|outorgado|poderes/i, label: 'Procuração / Outorga de Poderes' },
        { key: 'contrato', regex: /contrato|cl[aá]usula|honor[aá]rios|contratante|contratado/i, label: 'Contrato / Cláusulas de Honorários' },
        { key: 'peticao', regex: /excelent[ií]ssimo|ju[ií]zo|peti[cç][aã]o|requer| tutela |liminar/i, label: 'Peça Processual / Petição' },
        { key: 'sentenca', regex: /senten[cç]a|julgo|procedente|dispositivo|ac[oó]rd[aã]o/i, label: 'Decisão Judicial / Sentença' },
        { key: 'identidade', regex: /\brg\b|\bcpf\b|identidade|cnh|nascimento|certid[aã]o/i, label: 'Documento Pessoal / Certidão' },
        { key: 'endereco', regex: /comprovante|resid[eê]ncia|endere[cç]o|energia|água|fatura/i, label: 'Comprovante de Endereço / Fatura' },
      ];

      const detectedTerms = legalDictionary
        .filter((item) => item.regex.test(combinedSource))
        .map((item) => item.label);

      const docType =
        detectedTerms[0] ||
        (doc.kind === 'template' ? 'Modelo de Documento (.docx)' : 'Documento Jurídico / Anexo');

      const summaryText = `[Análise IA em ${new Date().toLocaleDateString('pt-BR')}]: Tipo: ${docType} | Volume: ${pagesOrWords}${
        cpfs.length ? ` | Docs: ${cpfs.join(', ')}` : ''
      }${cnjs.length ? ` | CNJ: ${cnjs.join(', ')}` : ''}${
        moneys.length ? ` | Valores: ${moneys.join(', ')}` : ''
      }`;

      // Salva o resumo real no banco de dados (internal_comments do documento)
      const sb = requireSupabase();
      await sb
        .from('documents')
        .update({ internal_comments: summaryText } as any)
        .eq('id', doc.id);

      setAiDocModal({
        docTitle: doc.title,
        clientName: doc.client_name || 'Cliente',
        docType,
        sizeKb,
        pagesOrWords,
        cpfsCnpjs: cpfs,
        cnjNumbers: cnjs,
        monetaryValues: moneys,
        detectedTerms: detectedTerms.length ? detectedTerms : ['Anexo Geral / Sem cláusulas críticas restritivas'],
        summaryText,
      });
    } catch (err: any) {
      setError(err?.message || 'Falha ao analisar documento.');
    } finally {
      setAnalyzingDoc(null);
    }
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
      <PageHeader
        icon={HardDrive}
        eyebrow="Operação"
        title="Cofre Digital & Smart Drive"
        subtitle="Gerencie documentos, acompanhe as pendências dos clientes e faça revisões com análise de conteúdo."
        actions={
          <>
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="btn-icon"
              title="Atualizar Dados"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <button onClick={() => setUploadOpen(true)} className="btn-primary">
              <Upload className="w-4 h-4" strokeWidth={1.75} />
              Novo Documento
            </button>
          </>
        }
      />

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
                  {!upTitleEdited && upClientId && (
                    <span className="text-[10px] text-white/45 mt-1 inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-sky-300" strokeWidth={1.75} />
                      Gerado automaticamente — edite se necessário
                    </span>
                  )}
                </>
              )}
              {upFiles.length > 1 && (
                <span className="text-[10px] text-white/45 mt-1 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-sky-300" strokeWidth={1.75} />
                  Nome gerado automaticamente por arquivo (Ex: João - Categoria - 01.06.2025 (1))
                </span>
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
                                {d.status === 'forwarded' && (
                                  <span className="ml-2 badge bg-purple-500/10 text-purple-300 border-purple-500/20">
                                    <Send className="h-3 w-3" strokeWidth={1.75} />
                                    Enc. Cartório
                                  </span>
                                )}
                                {d.status === 'filed' && (
                                  <span className="ml-2 badge bg-teal-500/10 text-teal-300 border-teal-500/20">
                                    <FolderCheck className="h-3 w-3" strokeWidth={1.75} />
                                    Protocolado
                                  </span>
                                )}
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

      {/* Modal Real de Análise Jurídica de Documento (IA) */}
      {aiDocModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setAiDocModal(null)}>
          <div
            className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-neutral-950 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Análise Inteligente de Documento</h3>
                  <p className="text-xs text-white/60">{aiDocModal.docTitle} · {aiDocModal.clientName}</p>
                </div>
              </div>
              <button onClick={() => setAiDocModal(null)} className="text-white/40 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/50">Classificação Detectada</div>
                <div className="mt-1 font-semibold text-amber-300">{aiDocModal.docType}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/50">Estrutura / Volume</div>
                <div className="mt-1 font-semibold text-white">{aiDocModal.pagesOrWords}</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="font-semibold text-white mb-1.5">Elementos Jurídicos Identificados:</div>
                <div className="flex flex-wrap gap-1.5">
                  {aiDocModal.detectedTerms.map((t, i) => (
                    <span key={i} className="badge border-amber-400/30 bg-amber-400/10 text-amber-200">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {aiDocModal.cpfsCnpjs.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className="text-white/60">CPF / CNPJ extraídos: </span>
                  <span className="font-mono text-white">{aiDocModal.cpfsCnpjs.join(', ')}</span>
                </div>
              ) : null}

              {aiDocModal.cnjNumbers.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className="text-white/60">Processos CNJ citados: </span>
                  <span className="font-mono text-amber-200">{aiDocModal.cnjNumbers.join(', ')}</span>
                </div>
              ) : null}

              {aiDocModal.monetaryValues.length > 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <span className="text-white/60">Valores monetários identificados: </span>
                  <span className="font-semibold text-emerald-300">{aiDocModal.monetaryValues.join(' · ')}</span>
                </div>
              ) : null}

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Resumo gravado no histórico interno do documento</span>
                </div>
                <p className="mt-1 text-[11px] opacity-90">{aiDocModal.summaryText}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setAiDocModal(null)} className="btn-primary !text-xs">
                Concluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
