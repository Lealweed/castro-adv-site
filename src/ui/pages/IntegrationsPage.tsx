import { useEffect, useState } from 'react';
import { Cpu, ClipboardCopy, Download, ExternalLink, ShieldCheck, Terminal, AlertTriangle, Key, RefreshCw, Landmark, CheckCircle2, Eye, EyeOff, Save, Webhook } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { env } from '@/env';
import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { getAsaasStatus, saveAsaasConfig, syncAsaasToCrm, type AsaasStatus, type AsaasSyncResult } from '@/lib/asaas';

export function IntegrationsPage() {
  // States para a API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<boolean>(false);
  const [apiKeyInfo, setApiKeyInfo] = useState<string | null>(null);

  // Status gerais
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

  // Integração Asaas
  const [asaasStatus, setAsaasStatus] = useState<AsaasStatus | null>(null);
  const [asaasLoading, setAsaasLoading] = useState<boolean>(true);
  const [asaasSyncing, setAsaasSyncing] = useState<boolean>(false);
  const [asaasSyncResult, setAsaasSyncResult] = useState<AsaasSyncResult | null>(null);
  const [asaasError, setAsaasError] = useState<string | null>(null);
  const [asaasKeyInput, setAsaasKeyInput] = useState<string>('');
  const [showAsaasKey, setShowAsaasKey] = useState<boolean>(false);
  const [savingAsaasKey, setSavingAsaasKey] = useState<boolean>(false);

  async function handleSaveAsaasKey(e: React.FormEvent) {
    e.preventDefault();
    if (!asaasKeyInput.trim()) return;
    setSavingAsaasKey(true);
    setAsaasError(null);
    try {
      const st = await saveAsaasConfig(asaasKeyInput.trim(), 'production');
      setAsaasStatus(st);
      setAsaasKeyInput('');
      if (!st.connected) {
        setAsaasError(st.message);
      }
    } catch (err: any) {
      setAsaasError(err?.message || 'Falha ao salvar a chave do Asaas.');
    } finally {
      setSavingAsaasKey(false);
    }
  }

  async function loadAsaasStatus() {
    setAsaasLoading(true);
    setAsaasError(null);
    try {
      const st = await getAsaasStatus();
      setAsaasStatus(st);
    } catch (err: any) {
      setAsaasError(err?.message || 'Não foi possível consultar o status do Asaas no servidor.');
    } finally {
      setAsaasLoading(false);
    }
  }

  async function handleSyncAsaas() {
    setAsaasSyncing(true);
    setAsaasError(null);
    setAsaasSyncResult(null);
    try {
      const res = await syncAsaasToCrm();
      setAsaasSyncResult(res);
      await loadAsaasStatus();
    } catch (err: any) {
      setAsaasError(err?.message || 'Falha ao sincronizar clientes e cobranças do Asaas.');
    } finally {
      setAsaasSyncing(false);
    }
  }

  useEffect(() => {
    void loadAsaasStatus();
  }, []);

  async function handleGerarApiKey() {
    setLoadingKey(true);
    setErrMessage(null);
    setApiKey(null);
    try {
      const res = await apiFetch('/integrations/api-key/gerar', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Falha ao comunicar com o servidor do backend.');
      }
      const data = await res.json();
      setApiKey(data.apiKey);
      setApiKeyInfo(data.organizationId);
    } catch (err: any) {
      setErrMessage(err.message || 'Erro ao gerar chave.');
    } finally {
      setLoadingKey(false);
    }
  }

  function copiarApiKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const swaggerUrl = `${env.apiBaseUrl}/api/docs`;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Webhook}
        eyebrow="Inteligência"
        accent="indigo"
        title="Integrações & API Pública"
        subtitle="Conecte o CRM Jurídico ao Asaas, n8n, Evolution API e agentes de automação via API Keys e Webhooks."
      />

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Coluna 1: Gestão de Acesso & Asaas */}
        <div className="space-y-6">
          {/* Card 0: Integração Asaas (Financeiro) */}
          <Card className="border border-amber-400/20 bg-neutral-950/70 p-6 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold text-amber-200 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-amber-400" />
                  Integração Asaas (Clientes & Cobranças)
                </h2>
                {asaasLoading ? (
                  <span className="badge">Verificando…</span>
                ) : asaasStatus?.connected ? (
                  <span className="badge border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                    Conectado ({asaasStatus.environment === 'production' ? 'Produção' : 'Sandbox'})
                  </span>
                ) : asaasStatus?.configured ? (
                  <span className="badge border-red-400/30 bg-red-400/10 text-red-300">
                    Erro de Autenticação
                  </span>
                ) : (
                  <span className="badge border-amber-400/30 bg-amber-400/10 text-amber-300">
                    Aguardando ASAAS_API_KEY no .env
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                Sincroniza automaticamente os clientes (por CPF/CNPJ) e as cobranças (PIX, Boleto e Cartão) da sua conta Asaas direto para o módulo <b>Financeiro</b> e para a <b>Ficha do Cliente</b> no CRM.
              </p>

              {/* Campo seguro para colar e salvar a chave direto no .env do servidor */}
              <form onSubmit={handleSaveAsaasKey} className="mb-4 rounded-xl border border-white/10 bg-neutral-900/60 p-3.5 space-y-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-200/90">
                  Configurar Chave de API do Asaas (Produção)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showAsaasKey ? 'text' : 'password'}
                      value={asaasKeyInput}
                      onChange={(e) => setAsaasKeyInput(e.target.value)}
                      placeholder="Cole aqui sua chave $aact_prod_..."
                      className="w-full rounded-lg border border-white/10 bg-neutral-950 pl-3 pr-9 py-2 text-xs font-mono text-white placeholder:text-neutral-500 focus:border-amber-400/50 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAsaasKey((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showAsaasKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={savingAsaasKey || !asaasKeyInput.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/40 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingAsaasKey ? 'Salvando…' : 'Salvar no .env'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400">
                  A chave é gravada de forma segura diretamente no arquivo <code className="font-mono text-amber-200/80">.env</code> do servidor backend e mascarada após salvar.
                </p>
              </form>

              {asaasStatus ? (
                <div className="mb-4 rounded-xl border border-white/10 bg-neutral-900/80 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Conta / Status:</span>
                    <span className="font-semibold text-white">{asaasStatus.accountName || asaasStatus.message}</span>
                  </div>
                  {asaasStatus.maskedKey ? (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Chave carregada (.env):</span>
                      <span className="font-mono text-amber-200">{asaasStatus.maskedKey}</span>
                    </div>
                  ) : null}
                  {typeof asaasStatus.walletBalance === 'number' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Saldo disponível Asaas:</span>
                      <span className="font-semibold text-emerald-300">
                        {asaasStatus.walletBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-neutral-400">Webhook de baixa automática:</span>
                    <code className="font-mono text-[10px] text-sky-300 select-all">{`${env.apiBaseUrl}/asaas/webhook`}</code>
                  </div>
                </div>
              ) : null}

              {asaasError ? (
                <div className="mb-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{asaasError}</span>
                </div>
              ) : null}

              {asaasSyncResult ? (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Sincronização concluída com sucesso!
                  </div>
                  <div>
                    • Clientes no Asaas: <b>{asaasSyncResult.customersProcessed}</b> ({asaasSyncResult.clientsCreated} novos criados, {asaasSyncResult.clientsMatched} vinculados)
                  </div>
                  <div>
                    • Cobranças processadas: <b>{asaasSyncResult.paymentsProcessed}</b> ({asaasSyncResult.paymentsCreated} novas importadas, {asaasSyncResult.paymentsUpdated} atualizadas)
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => void handleSyncAsaas()}
                  disabled={asaasSyncing}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-neutral-950 transition-all hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${asaasSyncing ? 'animate-spin' : ''}`} />
                  <span>{asaasSyncing ? 'Sincronizando com o Asaas…' : 'Sincronizar Clientes e Cobranças Agora'}</span>
                </button>
                <button
                  onClick={() => void loadAsaasStatus()}
                  disabled={asaasLoading || asaasSyncing}
                  className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800"
                >
                  Testar Conexão
                </button>
              </div>
            </div>
          </Card>

          {/* Card 1: Chaves de API */}
          <Card className="border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold text-amber-200 mb-2 flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-400" />
                Chaves de Acesso à API
              </h2>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Para integrar com o n8n ou criar um custom agent (GPTs/Gemini), você precisará de um token de autorização Bearer. Esta chave concede acesso seguro aos endpoints da sua organização.
              </p>

              {errMessage && (
                <div className="mb-4 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errMessage}</span>
                </div>
              )}

              {!apiKey ? (
                <div className="py-4">
                  <button
                    onClick={handleGerarApiKey}
                    disabled={loadingKey}
                    className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-semibold text-neutral-950 transition-all hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-500"
                  >
                    {loadingKey ? 'Gerando chave...' : 'Gerar Chave de Integração (API Key)'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-amber-300">Chave Gerada com Sucesso:</span>
                      <button
                        onClick={copiarApiKey}
                        className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                      >
                        <ClipboardCopy className="h-3.5 w-3.5" />
                        <span>{copiedKey ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <div className="mt-2.5 break-all rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5 max-h-24 overflow-y-auto select-all">
                      {apiKey}
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-[10px] text-neutral-400 leading-relaxed">
                      <p className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>ID da Organização ativo (enviar como header <b>X-Org-Id</b>): <span className="font-mono text-amber-200 select-all">{apiKeyInfo}</span></span>
                      </p>
                      <p className="mt-1 text-red-400">
                        * ATENÇÃO: Esta chave expira em 10 anos. Guarde-a em local seguro pois não poderá ser exibida novamente.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setApiKey(null)}
                    className="text-xs text-neutral-400 hover:text-white underline"
                  >
                    Gerar uma nova chave
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Coluna 2: Documentação & Integração */}
        <div className="space-y-6">
          {/* Card 2: Documentação Swagger */}
          <Card className="border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-amber-200 mb-2 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-amber-400" />
              Especificação OpenAPI & Swagger UI
            </h2>
            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Nosso backend possui uma especificação OpenAPI interativa com o Swagger, documentando detalhadamente todos os serviços como Casos, Contatos e a Calculadora de Prazos do CPC/2015.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href={swaggerUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/15"
              >
                <ExternalLink className="h-4 w-4 text-amber-400" />
                <span>Abrir Documentação (Swagger UI)</span>
              </a>
              <a
                href={`${env.apiBaseUrl}/api/docs-json`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-300 transition-all hover:bg-neutral-800"
              >
                <Download className="h-4 w-4" />
                <span>Baixar OpenAPI Spec (JSON)</span>
              </a>
            </div>
          </Card>

          {/* Card 3: Documentação Completa & Fluxos Prontos para n8n */}
          <Card className="border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-neutral-200 mb-2 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" />
              Catálogo de Endpoints & Fluxos para n8n
            </h2>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Use um nó <b>HTTP Request</b> no n8n com o cabeçalho <code className="font-mono text-amber-200">Authorization: Bearer &lt;SUA_API_KEY&gt;</code> para automatizar qualquer um dos 4 fluxos abaixo:
            </p>

            <div className="space-y-4 text-xs">
              {/* Fluxo 1: Captura de Lead WhatsApp -> Triagem */}
              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">1. Entrada de Lead (WhatsApp / Evolution → Triagem CRM)</span>
                  <span className="badge border-emerald-400/30 bg-emerald-400/10 text-emerald-300">POST</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Cadastra ou atualiza o cliente na fila de <b>Triagem (/app/triagem)</b> e cria opcionalmente o processo inicial:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5 select-all">
{`POST ${env.apiBaseUrl}/integrations/n8n/lead
Authorization: Bearer <SUA_API_KEY>
Content-Type: application/json

{
  "name": "Maria da Silva",
  "whatsapp": "5594991234567",
  "cpf": "12345678909",
  "email": "maria@email.com",
  "legal_area": "Trabalhista",
  "case_description": "Rescisão indireta e horas extras.",
  "create_case": true
}`}
                </pre>
              </div>

              {/* Fluxo 2: Cobrança Automática de Tarefas Atrasadas / SLA */}
              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">2. Radar de Tarefas Atrasadas / SLA 48h (Cobrança WhatsApp)</span>
                  <span className="badge border-sky-400/30 bg-sky-400/10 text-sky-300">GET</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Retorna todas as tarefas vencidas ou que vencem em 48h, já com o <b>nome e WhatsApp do advogado responsável</b> (<code className="font-mono">assignee.whatsapp</code>) configurado em Configurações/Equipe:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5 select-all">
{`GET ${env.apiBaseUrl}/integrations/n8n/overdue-tasks
Authorization: Bearer <SUA_API_KEY>`}
                </pre>
              </div>

              {/* Fluxo 3: Disparo de Alertas do n8n para o Sino do CRM */}
              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">3. Enviar Notificação / Evento do n8n para a Equipe</span>
                  <span className="badge border-emerald-400/30 bg-emerald-400/10 text-emerald-300">POST</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Cria um alerta imediato no <b>Sino de Notificações</b> do CRM para toda a equipe:
                </p>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5 select-all">
{`POST ${env.apiBaseUrl}/integrations/n8n/event
Authorization: Bearer <SUA_API_KEY>
Content-Type: application/json

{
  "event_type": "whatsapp_lead_qualified",
  "title": "Novo Lead Qualificado no WhatsApp",
  "message": "Cliente Maria da Silva enviou documentação inicial pelo WhatsApp.",
  "notify_team": true
}`}
                </pre>
              </div>

              {/* Fluxo 4: Calculadora de Prazos CPC/2015 */}
              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">4. Calculadora de Prazos CPC/2015 (Dias Úteis & Recesso)</span>
                  <span className="badge border-sky-400/30 bg-sky-400/10 text-sky-300">GET</span>
                </div>
                <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5 select-all">
{`GET ${env.apiBaseUrl}/prazos/calcular?dataPublicacao=2026-05-22&dias=15&incluirRecesso=true`}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
