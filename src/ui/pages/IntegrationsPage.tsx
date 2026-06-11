import { useState } from 'react';
import { Cpu, ClipboardCopy, Download, ExternalLink, ShieldCheck, Terminal, AlertTriangle, Key } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { env } from '@/env';
import { Card } from '@/ui/widgets/Card';

export function IntegrationsPage() {
  // States para a API Key
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<boolean>(false);
  const [apiKeyInfo, setApiKeyInfo] = useState<string | null>(null);

  // Status gerais
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string | null>(null);

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
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
          Integrações & API Pública
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Habilite o controle do CRM Navidade por agentes de IA, n8n ou outros sistemas externos de automação
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Coluna 1: Gestão de Acesso */}
        <div className="space-y-6">
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

          {/* Card 3: Instruções de Configuração */}
          <Card className="border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" />
              Guia Rápido de Conexão
            </h2>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5">
                <span className="font-bold text-amber-300">1. Chamadas HTTP Externas (cURL)</span>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-950 p-3 font-mono text-[10px] text-neutral-300 border border-white/5">
{`curl -X GET "${env.apiBaseUrl}/prazos/calcular?dataPublicacao=2026-05-22&dias=15" \\
  -H "Authorization: Bearer <SUA_API_KEY>" \\
  -H "X-Org-Id: <ID_DA_ORGANIZACAO>"`}
                </pre>
              </div>

              <div className="rounded-xl bg-neutral-900 p-4 border border-white/5">
                <span className="font-bold text-amber-300">2. Conexão no n8n</span>
                <p className="mt-2 text-neutral-400 leading-relaxed">
                  Adicione um nó de <b>HTTP Request</b> no n8n. Nas configurações do nó, insira a URL do endpoint desejado e adicione os seguintes headers:
                </p>
                <ul className="mt-2 list-inside list-disc pl-2 text-[11px] text-neutral-300 space-y-1">
                  <li>Header <code className="font-mono text-amber-200">Authorization</code>: Valor <code className="font-mono">Bearer &lt;sua_chave_de_api&gt;</code></li>
                  <li>Header <code className="font-mono text-amber-200">X-Org-Id</code>: Valor <code className="font-mono">&lt;seu_id_de_organizacao&gt;</code></li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default IntegrationsPage;
