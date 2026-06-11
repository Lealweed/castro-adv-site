import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Scale, Search, CheckCircle2, ChevronRight, FileText, X, Loader2 } from 'lucide-react';

import { Card } from '@/ui/widgets/Card';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';
import { loadCasesLite } from '@/lib/loadCasesLite';
import type { CaseLite } from '@/lib/loadCasesLite';
import { apiFetch } from '@/lib/apiClient';

type PublicationRow = {
  id: string;
  case_id: string | null;
  numero_processo: string;
  sigla_tribunal: string;
  tipo_comunicacao: string;
  nome_orgao: string;
  texto: string;
  data_disponibilizacao: string;
  meio: string;
  link: string;
  destinatarios: any[];
  destinatario_advogados: any[];
  is_read: boolean;
  created_at: string;
  
  case?: { title: string; id: string }[] | null;
};

export function PublicationsPage() {
  const [rows, setRows] = useState<PublicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [q, setQ] = useState('');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('unread');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await apiFetch('/pje/sync', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Falha ao acionar sincronização no servidor.');
      }
      // Aguarda 1.5s para que o scraper assíncrono processe as primeiras intimações
      await new Promise(resolve => setTimeout(resolve, 1500));
      await load();
    } catch (err: any) {
      setError(err?.message || 'Erro durante a sincronização com o PJe.');
    } finally {
      setSyncing(false);
    }
  }

  // States for linking to cases
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [casesList, setCasesList] = useState<CaseLite[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [caseSearchQuery, setCaseSearchQuery] = useState('');
  const [linkingInProgress, setLinkingInProgress] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb = requireSupabase();
      await getAuthedUser();

      const { data, error: fetchErr } = await sb
        .from('publications')
        .select('id, case_id, numero_processo, sigla_tribunal, tipo_comunicacao, nome_orgao, texto, data_disponibilizacao, meio, link, destinatarios, destinatario_advogados, is_read, created_at, case:cases(id,title)')
        .order('data_disponibilizacao', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchErr) throw new Error(fetchErr.message);

      setRows((data || []) as PublicationRow[]);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar intimações.');
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
        if (filterRead === 'unread') return !r.is_read;
        if (filterRead === 'read') return r.is_read;
        return true;
      })
      .filter((r) => {
        if (!term) return true;
        const hay = [r.numero_processo, r.sigla_tribunal, r.texto, r.nome_orgao, r.case?.[0]?.title].join(' ').toLowerCase();
        return hay.includes(term);
      });
  }, [rows, q, filterRead]);

  async function markAsRead(id: string) {
    try {
      const sb = requireSupabase();
      const { error } = await sb.from('publications').update({ is_read: true } as any).eq('id', id);
      if (error) throw new Error(error.message);
      
      setRows(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
    } catch (err: any) {
      alert('Falha ao marcar como lida: ' + err.message);
    }
  }

  async function openLinkModal() {
    setIsLinkModalOpen(true);
    if (casesList.length === 0) {
      setCasesLoading(true);
      try {
        const list = await loadCasesLite();
        setCasesList(list);
      } catch (err: any) {
        alert('Erro ao carregar casos: ' + err.message);
      } finally {
        setCasesLoading(false);
      }
    }
  }

  async function handleAssociateCase(caseId: string, caseTitle: string) {
    if (!selectedId) return;
    setLinkingInProgress(true);
    try {
      const sb = requireSupabase();
      const { error } = await sb
        .from('publications')
        .update({ case_id: caseId } as any)
        .eq('id', selectedId);

      if (error) throw new Error(error.message);

      setRows(prev =>
        prev.map(r =>
          r.id === selectedId
            ? {
                ...r,
                case_id: caseId,
                case: [{ id: caseId, title: caseTitle }]
              }
            : r
        )
      );
      setIsLinkModalOpen(false);
      setCaseSearchQuery('');
    } catch (err: any) {
      alert('Falha ao vincular caso: ' + err.message);
    } finally {
      setLinkingInProgress(false);
    }
  }

  const filteredCases = useMemo(() => {
    const term = caseSearchQuery.trim().toLowerCase();
    if (!term) return casesList;
    return casesList.filter(c => {
      const hay = [
        c.title,
        c.process_number || '',
        c.client?.[0]?.name || ''
      ].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [casesList, caseSearchQuery]);

  const selectedItem = rows.find(r => r.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <BellRing className="text-amber-400" />
            Diário Oficial (PJe)
          </h1>
          <p className="text-sm text-white/60">Sincronização automática com a API do Comunica PJe.</p>
        </div>
        <button 
          onClick={handleSync} 
          disabled={loading || syncing} 
          className="btn-ghost flex items-center gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin text-amber-400" />
              Sincronizando...
            </>
          ) : (
            'Atualizar agora'
          )}
        </button>
      </div>

      {error ? <div className="text-sm text-red-200 bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista Inbox */}
        <Card className="lg:col-span-1 p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-400"
                  placeholder="Buscar processo..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 p-1 bg-black/20 rounded-lg border border-white/5">
              <button 
                onClick={() => setFilterRead('unread')} 
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterRead === 'unread' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                Não Lidas ({rows.filter(r => !r.is_read).length})
              </button>
              <button 
                onClick={() => setFilterRead('all')} 
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterRead === 'all' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                Todas
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading && rows.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">Carregando diário...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">Caixa vazia.</div>
            ) : (
              filtered.map(pub => (
                <button 
                  key={pub.id}
                  onClick={() => {
                    setSelectedId(pub.id);
                    if (!pub.is_read) markAsRead(pub.id);
                  }}
                  className={`w-full text-left p-4 transition-colors flex gap-3 ${selectedId === pub.id ? 'bg-amber-400/10' : 'hover:bg-white/5'}`}
                >
                  <div className="pt-1">
                    {!pub.is_read ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                        {pub.sigla_tribunal}
                      </span>
                      <span className="text-xs text-white/40 font-mono">
                        {new Date(pub.data_disponibilizacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className={`text-sm truncate ${!pub.is_read ? 'font-semibold text-white' : 'text-white/80'}`}>
                      {pub.case?.[0]?.title || pub.numero_processo}
                    </div>
                    <div className="text-xs text-white/50 mt-1 line-clamp-2">
                      {pub.tipo_comunicacao}: {pub.nome_orgao}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Leitor de Publicação */}
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          {!selectedItem ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 p-10 text-center">
              <Scale className="w-16 h-16 mb-4 opacity-20" />
              <p>Selecione uma intimação na lista para realizar a leitura.</p>
            </div>
          ) : (
            <>
              <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-900/20 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge bg-blue-500/20 text-blue-200 border-blue-500/30">
                        {selectedItem.sigla_tribunal}
                      </span>
                      <span className="text-xs text-white/50">{selectedItem.tipo_comunicacao}</span>
                    </div>
                    <h2 className="text-lg font-bold text-white font-mono">
                      {selectedItem.numero_processo.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, '$1-$2.$3.$4.$5.$6')}
                    </h2>
                  </div>
                  
                  {selectedItem.case_id ? (
                    <Link to={`/app/casos/${selectedItem.case_id}`} className="btn-primary !py-1.5 !px-3 !text-xs shrink-0 flex items-center gap-1">
                      Ver Caso <ChevronRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <button 
                      onClick={openLinkModal}
                      className="btn-ghost !border-amber-500/30 !text-amber-200 !py-1.5 !px-3 !text-xs shrink-0 hover:bg-amber-500/10 transition-colors"
                    >
                      Vincular a um Caso
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/40 block text-xs mb-0.5">Órgão</span>
                    <span className="text-white/90">{selectedItem.nome_orgao}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-xs mb-0.5">Disponibilização</span>
                    <span className="text-white/90">{new Date(selectedItem.data_disponibilizacao).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-neutral-950/50">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-white/40" />
                  <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">Teor da Publicação</span>
                </div>
                
                <div 
                  className="prose prose-invert prose-sm max-w-none text-white/80 p-5 bg-black/40 rounded-xl border border-white/5 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: selectedItem.texto
                      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Basic XSS protection just in case
                  }} 
                />

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <a 
                    href={selectedItem.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    Ver no PJe
                  </a>
                  <Link 
                    to={`/app/calculadora?dataPublicacao=${selectedItem.data_disponibilizacao}&dias=15`}
                    className="btn-ghost border-amber-500/20 text-amber-300 hover:bg-amber-500/10"
                  >
                    Calcular Prazo no CPC
                  </Link>
                  <Link 
                    to={`/app/tarefas?new=1&caseId=${selectedItem.case_id || ''}&title=Analisar intimação: ${selectedItem.numero_processo}`}
                    className="btn-primary"
                  >
                    Criar Tarefa no CRM
                  </Link>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Modal de Vinculação */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slideIn">
            {/* Cabeçalho */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Vincular a um Caso</h3>
                <p className="text-xs text-white/50">Selecione o processo correspondente no CRM</p>
              </div>
              <button 
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setCaseSearchQuery('');
                }} 
                className="text-white/40 hover:text-white/80 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Busca */}
            <div className="p-4 border-b border-white/5 bg-black/20">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  className="w-full bg-[#121224] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-amber-400 text-white placeholder-white/30"
                  placeholder="Buscar por título, número ou cliente..."
                  value={caseSearchQuery}
                  onChange={(e) => setCaseSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de Casos */}
            <div className="flex-1 overflow-y-auto p-3 min-h-[200px] max-h-[400px] custom-scrollbar">
              {casesLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-white/50 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-sm">Carregando casos...</span>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-10 text-white/40 text-sm">
                  {caseSearchQuery ? 'Nenhum caso encontrado para esta busca.' : 'Nenhum caso disponível.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleAssociateCase(c.id, c.title)}
                      disabled={linkingInProgress}
                      className="w-full text-left p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all flex items-start justify-between group"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                          {c.title}
                        </div>
                        {c.process_number && (
                          <div className="text-xs text-white/40 font-mono mt-0.5">
                            CNJ: {c.process_number}
                          </div>
                        )}
                        {c.client?.[0]?.name && (
                          <div className="text-[10px] text-blue-300 bg-blue-500/10 inline-block px-1.5 py-0.5 rounded mt-1 font-medium">
                            Cliente: {c.client[0].name}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 border-t border-white/5 bg-black/20 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setCaseSearchQuery('');
                }}
                disabled={linkingInProgress}
                className="btn-ghost !text-white/60 hover:!text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}