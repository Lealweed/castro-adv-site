import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Folder,
  Home,
  LogOut,
  MessageCircle,
  Upload,
  User,
  AlertCircle,
  Calendar,
  Layers,
  ChevronRight,
  Download
} from 'lucide-react';
import {
  getPortalClientContext,
  getPortalRpcError,
  listPortalClientDocuments,
  listPortalClientMessages,
  listPortalClientTransactions,
  loginClientPortal,
  sendPortalClientMessage,
  listPortalClientCases,
  listPortalCaseChecklists,
  portalUploadChecklistDocument,
  type PortalClient,
  type PortalMeeting,
  type PortalMessage,
  type PortalCase,
  type PortalChecklistItem,
} from '@/lib/clientPortal';
import { ClientAvatar } from '@/ui/widgets/ClientAvatar';
import type { DocumentRow } from '@/lib/documents';
import { centsToBRL, type FinanceTx } from '@/lib/finance';
import { hasSupabaseEnv, supabase } from '@/lib/supabaseClient';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const PORTAL_USER_ID = '00000000-0000-0000-0000-000000000000';

type PortalState = 'login' | 'authenticated';
type TabKey = 'home' | 'drive' | 'finance' | 'messages';

export function ClientPortalPage() {
  // Utilitários
  function onlyDigits(value: string) {
    return value.replace(/\D/g, '');
  }

  function cleanPortalNotice(value: string | null | undefined) {
    if (!value) return null;
    return value
      .replace(/\[#origem:[^\]]+\]\s*/gi, '')
      .replace(/Nacionalidade:\s*[^\n]+\n?/gi, '')
      .trim() || null;
  }

  function formatCpfMask(value: string) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  // Estados principais
  const [state, setState] = useState<PortalState>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('clientPortalSessionToken')) {
      return 'authenticated';
    }
    return 'login';
  });
  const [portalSessionToken, setPortalSessionToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('clientPortalSessionToken');
  });
  const [client, setClient] = useState<PortalClient | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedClient = sessionStorage.getItem('clientPortalClient');
    if (!storedClient) return null;
    try {
      return JSON.parse(storedClient) as PortalClient;
    } catch {
      return null;
    }
  });
  const [cpfInput, setCpfInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabKey>('home');

  // Home
  const [clientNotes, setClientNotes] = useState<string | null>(null);
  const [nextMeeting, setNextMeeting] = useState<PortalMeeting | null>(null);
  
  // Cases & Checklists (Drive tab)
  const [cases, setCases] = useState<PortalCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [checklists, setChecklists] = useState<PortalChecklistItem[]>([]);
  const [checklistsLoading, setChecklistsLoading] = useState(false);
  
  // General documents
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  
  // Uploading states
  const [uploading, setUploading] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Financeiro
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  // Mensagens
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Fetch dados do cliente ao autenticar
  useEffect(() => {
    if (state !== 'authenticated' || !portalSessionToken) return;

    getPortalClientContext(portalSessionToken)
      .then(({ client: portalClient, nextMeeting }) => {
        setAuthError(null);
        setClient(portalClient);
        setClientNotes(cleanPortalNotice(portalClient.notes));
        setNextMeeting(nextMeeting);
      })
      .catch((err) => {
        setAuthError(getPortalRpcError(err, 'Sessão do portal inválida. Faça login novamente.'));
        setPortalSessionToken(null);
        setClient(null);
        setClientNotes(null);
        setNextMeeting(null);
        setMessages([]);
        setState('login');
      });
  }, [state, portalSessionToken]);

  useEffect(() => {
    if (tab !== 'drive' || !portalSessionToken) return;

    setDocsLoading(true);
    
    // Load cases
    listPortalClientCases(portalSessionToken)
      .then((data) => {
        setCases(data);
        if (data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data[0].id); // Auto-select first case
        }
      })
      .catch(() => setCases([]));

    // Load general documents
    listPortalClientDocuments(portalSessionToken)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [tab, portalSessionToken, selectedCaseId]);

  // Fetch checklists when case changes
  useEffect(() => {
    if (tab !== 'drive' || !portalSessionToken || !selectedCaseId) return;

    setChecklistsLoading(true);
    listPortalCaseChecklists(portalSessionToken, selectedCaseId)
      .then(setChecklists)
      .catch(() => setChecklists([]))
      .finally(() => setChecklistsLoading(false));
  }, [tab, portalSessionToken, selectedCaseId]);

  // Fetch transações financeiras
  useEffect(() => {
    if (tab !== 'finance' || !portalSessionToken) return;

    setFinanceLoading(true);
    listPortalClientTransactions(portalSessionToken)
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setFinanceLoading(false));
  }, [tab, portalSessionToken]);

  // Fetch mensagens
  useEffect(() => {
    if (tab !== 'messages' || !portalSessionToken) return;

    setMessagesError(null);
    listPortalClientMessages(portalSessionToken)
      .then(setMessages)
      .catch((err) => {
        setMessages([]);
        setMessagesError(getPortalRpcError(err, 'Não foi possível carregar as mensagens.'));
      });
  }, [tab, portalSessionToken]);

  // Checklist Item Document Upload
  async function handleChecklistUpload(itemId: string, itemTitle: string, file: File) {
    if (!portalSessionToken || !client?.id || !selectedCaseId) return;
    setUploading(true);
    setUploadingItemId(itemId);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`O arquivo "${file.name}" excede o limite de 25 MB.`);
      }

      await portalUploadChecklistDocument({
        sessionToken: portalSessionToken,
        clientId: client.id,
        caseId: selectedCaseId,
        checklistItemId: itemId,
        title: itemTitle,
        file,
      });

      setSuccessMsg(`Documento para "${itemTitle}" enviado com sucesso!`);
      
      // Reload checklist items
      const updatedChecklist = await listPortalCaseChecklists(portalSessionToken, selectedCaseId);
      setChecklists(updatedChecklist);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Falha ao enviar documento.'));
    } finally {
      setUploading(false);
      setUploadingItemId(null);
    }
  }

  // General documents upload (Fall back)
  async function handleGeneralFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length || !client?.id || !supabase) return;
    setUploading(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > MAX_UPLOAD_BYTES) {
          throw new Error(`"${file.name}" excede 25 MB.`);
        }
        const docId = crypto.randomUUID();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `clients/${client.id}/portal/${docId}_${safeName}`;
        
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw new Error(upErr.message);

        const { error: insErr } = await supabase.from('documents').insert({
          id: docId,
          user_id: PORTAL_USER_ID,
          client_id: client.id,
          case_id: selectedCaseId || null,
          kind: 'personal',
          title: `Portal: ${file.name}`,
          file_path: path,
          mime_type: file.type || null,
          size_bytes: file.size || null,
          is_public: true,
          status: 'under_analysis',
        });

        if (insErr) {
          await supabase.storage.from('documents').remove([path]).catch(() => null);
          throw new Error(insErr.message);
        }
      }
      setSuccessMsg(
        files.length === 1
          ? 'Documento recebido com sucesso!'
          : `${files.length} documentos recebidos com sucesso!`,
      );
      
      // Reload general documents
      const docs = await listPortalClientDocuments(portalSessionToken!);
      setDocuments(docs);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Falha ao enviar documento.'));
    } finally {
      setUploading(false);
    }
  }

  // Mantém sessão autenticada
  useEffect(() => {
    if (state === 'authenticated' && portalSessionToken) {
      sessionStorage.setItem('clientPortalSessionToken', portalSessionToken);
      if (client) {
        sessionStorage.setItem('clientPortalClient', JSON.stringify(client));
      }
    }
    if (state === 'login') {
      sessionStorage.removeItem('clientPortalId');
      sessionStorage.removeItem('clientPortalSessionToken');
      sessionStorage.removeItem('clientPortalClient');
    }
  }, [state, portalSessionToken, client]);

  function getErrorMessage(err: unknown, fallback: string) {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string') {
      return err.message;
    }
    return fallback;
  }

  /* ── Layout ── */

  function handlePortalExit() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('clientPortalId');
      sessionStorage.removeItem('clientPortalSessionToken');
      sessionStorage.removeItem('clientPortalClient');
    }
    setPortalSessionToken(null);
    setClient(null);
    setClientNotes(null);
    setNextMeeting(null);
    setMessages([]);
    setDocuments([]);
    setTransactions([]);
    setCases([]);
    setChecklists([]);
    setSelectedCaseId(null);
    setTab('home');
    setState('login');
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  async function handleDownloadFile(filePath: string) {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 60 * 10);
      if (error) throw new Error(error.message);
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (!hasSupabaseEnv || !supabase) {
    return (
      <div className="min-h-screen bg-[#08090b] flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="size-12 text-red-400" />
        <h1 className="text-xl font-semibold text-white">Portal Indisponível</h1>
        <p className="text-sm text-white/50 text-center max-w-sm">
          Configuração de ambiente não encontrada para acessar o portal do cliente.
        </p>
      </div>
    );
  }

  if (state === 'login') {
    return (
      <div className="min-h-screen bg-[#08090b] flex flex-col items-center px-4 py-8">
        <img
          src="/brand/logo.jpg"
          alt="Castro & Oliveira Advocacia"
          className="h-16 w-auto rounded-xl shadow-lg"
        />
        <div className="mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold text-white">Acessar Meu Portal</h1>
          <p className="mt-2 text-sm text-white/60">Informe seu CPF e sua Senha Numérica (PIN) para acessar o portal.</p>

          <form className="mt-5 grid gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setAuthLoading(true);
            setAuthError(null);
            try {
              const cpfLimpo = onlyDigits(cpfInput);
              if (cpfLimpo.length !== 11) throw new Error('CPF inválido.');
              if (!pinInput.trim()) throw new Error('Informe sua senha numérica (PIN).');
              
              const portalLogin = await loginClientPortal(cpfLimpo, pinInput.trim());
              setPortalSessionToken(portalLogin.sessionToken);
              setClient(portalLogin.client);
              setClientNotes(cleanPortalNotice(portalLogin.client.notes));
              setState('authenticated');
            } catch (err) {
              setAuthError(getErrorMessage(err, 'CPF ou Senha incorretos.'));
            } finally {
              setAuthLoading(false);
            }
          }}>
            <label className="text-sm text-white/80">
              CPF
              <input
                className="input mt-1"
                value={cpfInput}
                onChange={(e) => setCpfInput(formatCpfMask(e.target.value))}
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                autoFocus
              />
            </label>
            <label className="text-sm text-white/80">
              Senha (PIN)
              <div className="relative mt-1">
                <input
                  className="input w-full pr-10"
                  value={pinInput}
                  onChange={(e) => setPinInput(onlyDigits(e.target.value).slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="PIN numérico"
                  type={showPin ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/80"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            {authError ? (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{authError}</div>
            ) : null}
            <button className="btn-primary mt-1" type="submit" disabled={authLoading}>
              {authLoading ? 'Acessando...' : 'Acessar meu Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0c10] via-[#10131a] to-[#181c24] flex flex-col items-center px-0 py-0 pb-20 md:pb-6">
      <div className="mt-10 mb-4 flex w-full max-w-xl items-center justify-between gap-4 px-4">
        <img src="/brand/logo.jpg" alt="Castro & Oliveira Advocacia" className="h-20 w-auto rounded-2xl border-2 border-white/10 shadow-2xl" />
        <button
          type="button"
          onClick={handlePortalExit}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>

      {/* Profile Header */}
      {state === 'authenticated' && client && (
        <div className="flex flex-col items-center gap-3 mt-2 mb-6">
          <div className="flex items-center gap-4">
            <ClientAvatar name={client.name} avatarPath={client.avatar_path} size={72} />
            <div>
              <div className="text-2xl font-bold text-white font-[Space_Grotesk] drop-shadow-lg">{client.name}</div>
              <div className="text-sm text-white/70 font-[Inter]">{client.email || '—'}</div>
            </div>
          </div>
          <div className="flex gap-6 text-base text-white/90 mt-2 font-[Inter]">
            <span className="flex items-center gap-1"><span className="text-amber-300">📱</span> {client.phone || '—'}</span>
            <span className="flex items-center gap-1"><span className="text-amber-300">💬</span> {client.whatsapp || '—'}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-xl mx-auto flex flex-col mt-2">
        {/* Tab Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex justify-around bg-[#0a0c10]/95 backdrop-blur-md border-t border-white/10 py-3 md:static md:rounded-2xl md:border md:bg-white/5 md:mb-6">
          <button className={`flex flex-col items-center gap-1 px-2 transition-colors ${tab === 'home' ? 'text-amber-300' : 'text-white/60 hover:text-white'}`} onClick={() => setTab('home')}><Home className="size-5" /><span className="text-[10px] font-semibold">Início</span></button>
          <button className={`flex flex-col items-center gap-1 px-2 transition-colors ${tab === 'drive' ? 'text-amber-300' : 'text-white/60 hover:text-white'}`} onClick={() => setTab('drive')}><Folder className="size-5" /><span className="text-[10px] font-semibold">Pendências</span></button>
          <button className={`flex flex-col items-center gap-1 px-2 transition-colors ${tab === 'finance' ? 'text-amber-300' : 'text-white/60 hover:text-white'}`} onClick={() => setTab('finance')}><CreditCard className="size-5" /><span className="text-[10px] font-semibold">Financeiro</span></button>
          <button className={`flex flex-col items-center gap-1 px-2 transition-colors ${tab === 'messages' ? 'text-amber-300' : 'text-white/60 hover:text-white'}`} onClick={() => setTab('messages')}><MessageCircle className="size-5" /><span className="text-[10px] font-semibold">Mensagens</span></button>
        </nav>

        <div className="flex-1 w-full px-4 py-6 md:rounded-2xl md:border md:border-white/10 md:bg-white/5 md:mt-2 md:mb-4 min-h-[60vh]">
          {/* Notifications / Alerts banner */}
          {successMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-green-400/30 bg-green-400/10 p-4 mb-4">
              <CheckCircle2 className="size-5 shrink-0 text-green-300" />
              <span className="text-sm text-green-200">{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-red-400/30 bg-red-400/10 p-4 mb-4">
              <AlertTriangle className="size-5 shrink-0 text-red-300" />
              <span className="text-sm text-red-200">{errorMsg}</span>
            </div>
          )}

          {/* HOME TAB */}
          {tab === 'home' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-amber-300/30 bg-amber-400/5 p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                <div className="font-semibold text-white mb-1.5 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-amber-300" /> Informativo da Advocacia</div>
                <div className="text-sm text-white/80 min-h-[32px] leading-relaxed whitespace-pre-line">{clientNotes || 'Nenhum informativo importante no momento.'}</div>
              </div>
              
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-sky-400" /> Próxima Consulta / Reunião</div>
                {nextMeeting ? (
                  <div className="text-sm text-white/80 bg-black/25 border border-white/5 rounded-xl p-3">
                    <span className="font-semibold text-white block text-sm">{nextMeeting.title}</span>
                    <span className="text-xs text-white/50 block mt-1">{new Date(nextMeeting.starts_at).toLocaleString('pt-BR')}</span>
                  </div>
                ) : (
                  <div className="text-sm text-white/40 text-center py-4">Nenhuma consulta ou reunião agendada.</div>
                )}
              </div>
            </div>
          )}

          {/* DRIVE / CHECKLISTS TAB */}
          {tab === 'drive' && (
            <div className="space-y-6">
              {/* Case selector if multiple cases exist */}
              {cases.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider block">Escolha o Processo:</label>
                  <div className="grid gap-2">
                    {cases.map((c) => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedCaseId(c.id)}
                        className={`text-left p-3 rounded-xl border flex items-center justify-between transition-all ${selectedCaseId === c.id ? 'border-amber-400/50 bg-amber-400/5 text-white' : 'border-white/10 bg-white/5 text-white/60 hover:text-white'}`}
                      >
                        <div>
                          <div className="text-sm font-semibold">{c.title}</div>
                          {c.process_number && <div className="text-xs text-white/40 mt-0.5">Proc: {c.process_number}</div>}
                        </div>
                        <ChevronRight className={`w-4 h-4 ${selectedCaseId === c.id ? 'text-amber-400' : 'text-white/20'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist Items section */}
              {selectedCaseId && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Documentos Requeridos
                    </h3>
                    <span className="text-[10px] font-semibold text-white/40">
                      {checklists.filter(c => c.status === 'approved').length} de {checklists.length} Aprovados
                    </span>
                  </div>

                  {checklistsLoading ? (
                    <div className="p-8 text-center text-sm text-white/50">Carregando pendências...</div>
                  ) : checklists.length === 0 ? (
                    <div className="text-center py-6 text-sm text-white/40 border border-white/10 rounded-2xl bg-white/5">
                      Nenhuma pendência de documento configurada para este processo.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {checklists.map((item) => {
                        const isPending = item.status === 'pending';
                        const isUnderAnalysis = item.status === 'under_analysis';
                        const isApproved = item.status === 'approved';
                        const isRejected = item.status === 'rejected';

                        return (
                          <div 
                            key={item.id} 
                            className={`rounded-2xl border p-4 transition-all relative ${
                              isApproved ? 'border-emerald-500/20 bg-emerald-500/5' :
                              isUnderAnalysis ? 'border-blue-500/20 bg-blue-500/5' :
                              isRejected ? 'border-red-500/25 bg-red-500/5' :
                              'border-white/10 bg-white/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  {item.title}
                                </h4>
                                {item.description && <p className="text-xs text-white/60 leading-relaxed">{item.description}</p>}
                                
                                {item.due_date && (
                                  <div className="text-[10px] text-white/40 flex items-center gap-1 mt-1">
                                    <Calendar className="w-3.5 h-3.5" /> Prazo de envio: {new Date(item.due_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>

                              {/* Status badges */}
                              <div>
                                {isApproved && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/10">Aprovado</span>}
                                {isUnderAnalysis && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/10">Em Análise</span>}
                                {isRejected && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/25 text-red-300 border border-red-500/10">Corrigir</span>}
                                {isPending && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-white/5 text-white/50 border border-white/10">Pendente</span>}
                              </div>
                            </div>

                            {/* Rejection comment display */}
                            {isRejected && item.rejection_reason && (
                              <div className="mt-3 text-xs bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-red-200">
                                <strong>Ajuste solicitado pelo advogado:</strong> {item.rejection_reason}
                              </div>
                            )}

                            {/* Active linked document download */}
                            {item.document_file_path && (
                              <div className="mt-3 flex items-center justify-between bg-black/20 rounded-xl p-2.5 border border-white/5 text-xs text-white/70">
                                <span className="truncate max-w-[250px]">{item.document_title || 'Documento enviado'}</span>
                                <button 
                                  onClick={() => handleDownloadFile(item.document_file_path!)}
                                  className="text-amber-400 hover:underline flex items-center gap-1 font-semibold hover:text-amber-300"
                                >
                                  <Download className="w-3.5 h-3.5" /> Baixar
                                </button>
                              </div>
                            )}

                            {/* Action to upload / replace */}
                            {(isPending || isRejected || isUnderAnalysis) && (
                              <div className="mt-4">
                                <label className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-center transition-all ${
                                  uploading && uploadingItemId === item.id 
                                    ? 'border-amber-400/40 bg-amber-400/5' 
                                    : 'border-white/15 bg-black/10 hover:border-amber-400/30 hover:bg-white/5'
                                }`}>
                                  <Upload className={`w-4 h-4 ${uploading && uploadingItemId === item.id ? 'animate-bounce text-amber-400' : 'text-white/40'}`} />
                                  <span className="text-xs font-semibold text-white">
                                    {uploading && uploadingItemId === item.id 
                                      ? 'Enviando...' 
                                      : item.document_file_path ? 'Substituir / Nova Versão' : 'Anexar Documento'}
                                  </span>
                                  <input 
                                    type="file" 
                                    accept="image/*,.pdf" 
                                    className="absolute inset-0 cursor-pointer opacity-0" 
                                    disabled={uploading}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleChecklistUpload(item.id, item.title, file);
                                    }}
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* General / Other Documents Area */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="font-semibold text-white text-xs uppercase tracking-wider block text-white/60">Outros Arquivos Enviados</div>
                
                {/* Fallback Upload Box */}
                <label className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center transition-all ${uploading && !uploadingItemId ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/15 bg-white/5 hover:border-amber-300/40 hover:bg-white/10'}`}>
                  <Upload className={`size-6 ${uploading && !uploadingItemId ? 'animate-bounce text-amber-400' : 'text-white/40'}`} />
                  <span className="text-xs font-semibold text-white">{uploading && !uploadingItemId ? 'Enviando...' : 'Enviar outro documento avulso'}</span>
                  <input type="file" accept="image/*,.pdf" multiple className="absolute inset-0 cursor-pointer opacity-0" onChange={handleGeneralFiles} disabled={uploading} />
                </label>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  {docsLoading ? (
                    <div className="text-white/40 text-xs text-center py-2">Carregando...</div>
                  ) : documents.length > 0 ? (
                    <ul className="space-y-2">
                      {documents.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between text-xs text-white/80 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="size-4 shrink-0 text-amber-300" />
                            <span className="truncate font-medium">{doc.title}</span>
                            {doc.status === 'under_analysis' && <span className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1">Análise</span>}
                            {doc.status === 'approved' && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1">Ok</span>}
                            {doc.status === 'rejected' && <span className="text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-1">Corrigir</span>}
                          </div>
                          <button onClick={() => handleDownloadFile(doc.file_path)} className="text-amber-400 hover:underline shrink-0 ml-3">Baixar</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-white/40 text-xs text-center py-2">Nenhum outro arquivo avulso enviado.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FINANCE TAB */}
          {tab === 'finance' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="font-semibold text-white mb-3 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-amber-400" /> Extrato Financeiro</div>
                {financeLoading ? <div className="text-white/40 text-sm">Carregando...</div> : transactions.length > 0 ? (
                  <ul className="space-y-3">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <div>
                          <div className="text-white/80 font-medium">{tx.description || 'Parcela'}</div>
                          <div className="text-xs text-white/40 mt-0.5">
                            {tx.due_date ? new Date(tx.due_date).toLocaleDateString('pt-BR') : 'Sem vencimento'}
                          </div>
                        </div>
                        <div className={`font-medium ${tx.status === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                          {centsToBRL(tx.amount_cents)}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <div className="text-white/40 text-sm text-center py-6">Nenhuma movimentação financeira encontrada.</div>}
              </div>
            </div>
          )}

          {/* MESSAGES TAB */}
          {tab === 'messages' && (
            <div className="flex flex-col h-full min-h-[50vh]">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 max-h-[50vh]">
                {messagesError && (
                  <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                    {messagesError}
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-white/40 text-sm text-center py-6">Nenhuma mensagem no histórico.</div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'client' ? 'flex-row-reverse' : ''}`}>
                    {msg.sender === 'client' ? (
                      <ClientAvatar name={client?.name || 'Cliente'} avatarPath={client?.avatar_path} size={32} />
                    ) : (
                      <div className="rounded-full bg-amber-300/80 flex items-center justify-center w-8 h-8 shrink-0">
                        <User className="text-neutral-900 w-4 h-4" />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[75%] text-sm shadow ${msg.sender === 'client' ? 'bg-amber-400/15 text-white border border-amber-400/10' : 'bg-white/10 text-white/80 border border-white/5'}`}>
                      <div>{msg.content}</div>
                      <div className="text-[9px] text-white/40 mt-1 text-right">{new Date(msg.created_at).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form className="flex gap-2 mt-auto" onSubmit={async (e) => {
                e.preventDefault();
                if (!messageInput.trim() || !portalSessionToken) return;
                setSendingMsg(true);
                setMessagesError(null);
                try {
                  await sendPortalClientMessage(portalSessionToken, messageInput.trim());
                  setMessageInput('');
                  setMessages(await listPortalClientMessages(portalSessionToken));
                } catch (err) {
                  setMessagesError(getPortalRpcError(err, 'Não foi possível enviar sua mensagem.'));
                } finally {
                  setSendingMsg(false);
                }
              }}>
                <input
                  className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/50"
                  placeholder="Digite sua mensagem..."
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  disabled={sendingMsg}
                />
                <button type="submit" className="btn-primary !text-xs !py-2.5" disabled={sendingMsg || !messageInput.trim()}>Enviar</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <p className="mt-12 text-[11px] text-white/30 mb-24 md:mb-0">
        Castro & Oliveira Advocacia &bull; Portal do Cliente
      </p>
    </div>
  );
}
