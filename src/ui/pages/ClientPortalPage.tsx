import { useEffect, useState, useRef } from 'react';
import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { getDocumentDownloadUrl, uploadClientDocument, type DocumentRow } from '@/lib/documents';
import { Download, Upload, FileText, CheckCircle, Clock } from 'lucide-react';

type ClientCase = {
  id: string;
  title: string;
  status: string;
  process_number: string | null;
  area: string | null;
  court: string | null;
  datajud_last_movement_text: string | null;
  datajud_last_movement_at: string | null;
  responsible_user_id: string | null;
};

export function ClientPortalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const user = await getAuthedUser();

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/ui/widgets/Card';
import { getDocumentDownloadUrl, uploadClientDocument, type DocumentRow } from '@/lib/documents';
import { Download, Upload, FileText, CheckCircle, Clock, Eye, EyeOff, LogOut, Folder, MessageCircle, Home, DollarSign } from 'lucide-react';

export function ClientPortalPage() {
  // Login state
  const [step, setStep] = useState<'login'|'dashboard'>('login');
  const [cpf, setCpf] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginError, setLoginError] = useState<string|null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard state
  const [client, setClient] = useState<any>(null);
  const [tab, setTab] = useState<'home'|'files'|'finance'|'messages'>('home');
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Login handler
  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const sb = (await import('@/lib/supabaseClient')).supabaseClient;
      const { data, error } = await sb.rpc('login_client_portal', { p_cpf: cpf.replace(/\D/g, ''), p_pin: pin });
      if (error || !data || !data.id) throw new Error('CPF ou PIN inválidos.');
      setClient(data);
      setStep('dashboard');
      await loadDashboard(data.id);
    } catch (err: any) {
      setLoginError(err.message || 'Falha no login.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function loadDashboard(clientId: string) {
    setLoading(true);
    try {
      const sb = (await import('@/lib/supabaseClient')).supabaseClient;
      const [{ data: casesData }, { data: docsData }, { data: txData }, { data: msgData }] = await Promise.all([
        sb.from('cases').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        sb.from('documents').select('*').eq('client_id', clientId).eq('is_public', true).order('created_at', { ascending: false }),
        sb.from('finance_transactions').select('*').eq('client_id', clientId).order('due_date', { ascending: false }),
        sb.from('client_messages').select('*').eq('client_id', clientId).order('created_at', { ascending: true }),
      ]);
      setCases(casesData || []);
      setDocuments(docsData || []);
      setTransactions(txData || []);
      setMessages(msgData || []);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setStep('login');
    setClient(null);
    setCpf('');
    setPin('');
    setTab('home');
    setLoginError(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !client) return;
    setUploading(true);
    try {
      await uploadClientDocument({
        clientId: client.id,
        kind: 'personal',
        title: `Enviado pelo cliente: ${file.name}`,
        file,
        isPublic: true,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDashboard(client.id);
    } finally {
      setUploading(false);
    }
  }

  async function sendMessage() {
    if (!msgInput.trim() || !client) return;
    setSendingMsg(true);
    try {
      const sb = (await import('@/lib/supabaseClient')).supabaseClient;
      await sb.from('client_messages').insert({ client_id: client.id, message: msgInput.trim(), sender: 'client' });
      setMsgInput('');
      await loadDashboard(client.id);
    } finally {
      setSendingMsg(false);
    }
  }

  // UI
  if (step === 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 to-neutral-950 p-4">
        <Card className="max-w-xs w-full p-6 space-y-6 bg-white/5 border-white/10">
          <h2 className="text-xl font-bold text-white mb-2 text-center">Acesso ao Portal do Cliente</h2>
          <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">
            <div>
              <label className="block text-xs text-white/70 mb-1">CPF</label>
              <input
                className="input w-full text-lg tracking-widest"
                value={cpf}
                onChange={e => setCpf(e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0,14))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">PIN de Acesso</label>
              <div className="relative flex items-center">
                <input
                  className="input w-full text-lg tracking-widest pr-10"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0,6))}
                  placeholder="PIN numérico"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <button type="button" className="absolute right-2 text-white/60" tabIndex={-1} onClick={() => setShowPin(v => !v)}>
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {loginError ? <div className="text-xs text-red-300 text-center">{loginError}</div> : null}
            <button type="submit" className="btn-primary w-full mt-2" disabled={loggingIn}>{loggingIn ? 'Entrando...' : 'Entrar'}</button>
          </form>
        </Card>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-neutral-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg">Portal do Cliente</span>
        </div>
        <button onClick={handleLogout} className="btn-ghost flex items-center gap-1 text-xs"><LogOut className="w-4 h-4" /> Sair</button>
      </header>
      <nav className="flex justify-around border-b border-white/10 bg-black/20">
        <button className={`flex-1 py-3 flex flex-col items-center gap-1 ${tab==='home'?'text-blue-400 font-bold':'text-white/60'}`} onClick={()=>setTab('home')}><Home className="w-5 h-5" />Início</button>
        <button className={`flex-1 py-3 flex flex-col items-center gap-1 ${tab==='files'?'text-blue-400 font-bold':'text-white/60'}`} onClick={()=>setTab('files')}><Folder className="w-5 h-5" />Arquivos</button>
        <button className={`flex-1 py-3 flex flex-col items-center gap-1 ${tab==='finance'?'text-blue-400 font-bold':'text-white/60'}`} onClick={()=>setTab('finance')}><DollarSign className="w-5 h-5" />Financeiro</button>
        <button className={`flex-1 py-3 flex flex-col items-center gap-1 ${tab==='messages'?'text-blue-400 font-bold':'text-white/60'}`} onClick={()=>setTab('messages')}><MessageCircle className="w-5 h-5" />Mensagens</button>
      </nav>
      <main className="flex-1 p-4 max-w-2xl w-full mx-auto">
        {loading ? <div className="text-center text-white/50 animate-pulse">Carregando...</div> : null}
        {!loading && tab==='home' && (
          <Card className="mb-4">
            <div className="text-lg font-bold text-white mb-2">Bem-vindo, {client?.name?.split(' ')[0]}</div>
            <div className="text-sm text-white/80 whitespace-pre-wrap">{client?.notes || 'Nenhuma anotação disponível.'}</div>
          </Card>
        )}
        {!loading && tab==='files' && (
          <>
            <Card className="mb-4">
              <div className="text-sm font-semibold text-white mb-2">Enviar documento</div>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-blue-500/30 rounded-xl hover:bg-blue-500/5 hover:border-blue-500/50 transition-colors cursor-pointer relative">
                {uploading ? (
                  <span className="text-sm text-blue-300 font-semibold animate-pulse">Enviando...</span>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-blue-400 mb-2" />
                    <span className="text-xs font-semibold text-blue-200">Toque para selecionar</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                  accept="image/*,application/pdf"
                />
              </label>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-white/5 font-semibold text-sm">Seus Arquivos</div>
              {documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-white/50">Nenhum documento enviado.</div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate" title={doc.title}>{doc.title}</p>
                        <p className="text-[10px] text-white/40 mt-1">{new Date(doc.created_at).toLocaleDateString()} {doc.size_bytes ? ` • ${(doc.size_bytes / 1024 / 1024).toFixed(2)}MB` : ''}</p>
                      </div>
                      <button onClick={async()=>{
                        const url = await getDocumentDownloadUrl(doc.file_path);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }} className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-amber-400 hover:text-black transition-colors" title="Baixar arquivo">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
        {!loading && tab==='finance' && (
          <Card>
            <div className="text-lg font-bold text-white mb-2">Financeiro</div>
            {transactions.length === 0 ? (
              <div className="text-sm text-white/60">Nenhuma movimentação financeira encontrada.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {transactions.map((tx:any) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-sm">{tx.description}</div>
                      <div className="text-xs text-white/50">Vencimento: {tx.due_date ? new Date(tx.due_date).toLocaleDateString() : '—'}</div>
                    </div>
                    <div className={`text-right font-bold ${tx.type==='income'?'text-emerald-400':'text-red-300'}`}>{(tx.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        {!loading && tab==='messages' && (
          <Card>
            <div className="text-lg font-bold text-white mb-2">Mensagens</div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-2">
              {messages.length === 0 ? <div className="text-xs text-white/40">Nenhuma mensagem.</div> : null}
              {messages.map((msg:any) => (
                <div key={msg.id} className={`text-xs px-2 py-1 rounded ${msg.sender==='client'?'bg-blue-900/40 text-blue-200 self-end':'bg-white/10 text-white/80 self-start'}`}>
                  <span className="font-semibold">{msg.sender==='client'?'Você':'Escritório'}:</span> {msg.message}
                  <span className="ml-2 text-[10px] text-white/40">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input className="input flex-1" value={msgInput} onChange={e=>setMsgInput(e.target.value)} placeholder="Mensagem..." />
              <button onClick={sendMessage} disabled={sendingMsg || !msgInput.trim()} className="btn-primary !px-3 !py-1.5 text-xs">{sendingMsg ? 'Enviando...' : 'Enviar'}</button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
