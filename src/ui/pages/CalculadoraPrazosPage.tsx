import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ClipboardCopy, Info, AlertCircle, CheckCircle2, AlertTriangle, CalendarDays, CalendarPlus } from 'lucide-react';
import { apiFetch } from '@/lib/apiClient';
import { Card } from '@/ui/widgets/Card';
import { useSearchParams, Link } from 'react-router-dom';

type DetalheDia = {
  data: string;
  diaSemana: string;
  isUtil: boolean;
  motivo: string;
  numeroDiaUtil?: number;
};

type ResultadoPrazo = {
  dataPublicacao: string;
  diesAQuo: string;
  dataVencimento: string;
  totalDiasUteis: number;
  totalDiasCorridos: number;
  detalhes: DetalheDia[];
};

export function CalculadoraPrazosPage() {
  const [dataPublicacao, setDataPublicacao] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dias, setDias] = useState<number>(15);
  const [incluirRecesso, setIncluirRecesso] = useState<boolean>(true);
  const [resultado, setResultado] = useState<ResultadoPrazo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchParams] = useSearchParams();

  async function executarCalculo(dataPub: string, quantDias: number, inclRecesso: boolean) {
    setLoading(true);
    setError(null);
    setResultado(null);
    setCopied(false);

    try {
      const res = await apiFetch(`/prazos/calcular?dataPublicacao=${dataPub}&dias=${quantDias}&incluirRecesso=${inclRecesso}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || 'Falha ao realizar o cálculo.');
      }
      const data = await res.json() as ResultadoPrazo;
      setResultado(data);
    } catch (err: any) {
      setError(err?.message || 'Falha na conexão com a API de prazos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCalcular(e: React.FormEvent) {
    e.preventDefault();
    await executarCalculo(dataPublicacao, dias, incluirRecesso);
  }

  useEffect(() => {
    const dataPubParam = searchParams.get('dataPublicacao');
    const diasParam = searchParams.get('dias');
    
    if (dataPubParam) {
      const normalizedDate = dataPubParam.split('T')[0];
      setDataPublicacao(normalizedDate);
      
      let parsedDias = 15;
      if (diasParam) {
        const parsed = parseInt(diasParam, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
          parsedDias = parsed;
          setDias(parsed);
        }
      }
      executarCalculo(normalizedDate, parsedDias, incluirRecesso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function formatarDataBR(dataStr: string): string {
    if (!dataStr) return '';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function copiarRelatorio() {
    if (!resultado) return;

    const detalhesFeriados = resultado.detalhes
      .filter(d => !d.isUtil && d.motivo.includes('Feriado'))
      .map(d => `- ${formatarDataBR(d.data)} (${d.diaSemana}): ${d.motivo}`)
      .join('\n');

    const suspensaoRecesso = resultado.detalhes.some(d => d.motivo.includes('Recesso'))
      ? '\n- Período de suspensão forense pelo recesso judiciário (Art. 220 do CPC/2015).'
      : '';

    const texto = `MENSURAÇÃO E COMPROVAÇÃO DE TEMPESTIVIDADE (CPC/2015)
-----------------------------------------------------------
Data de Publicação/Intimação: ${formatarDataBR(resultado.dataPublicacao)}
Início da Contagem (Dies a quo): ${formatarDataBR(resultado.diesAQuo)}
Prazo Processual: ${resultado.totalDiasUteis} dias úteis
Data de Vencimento (Dies ad quem): ${formatarDataBR(resultado.dataVencimento)}
Dias Corridos Transcorridos: ${resultado.totalDiasCorridos} dias

Feriados e Suspensões ocorridos no período:${suspensaoRecesso || '\n- Sem suspensão por recesso.'}
${detalhesFeriados || '- Sem feriados federais no período.'}

Cálculo gerado automaticamente pelo CRM Jurídico Navidade de acordo com o Art. 219 e Art. 220 do CPC/2015.`;

    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-white">
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
            Calculadora de Prazos Judiciais
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Contagem automatizada de prazos processuais em dias úteis nos moldes da Lei nº 13.105/2015 (CPC/2015)
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300 self-start md:self-auto">
          <CalendarDays className="h-4 w-4" />
          <span>Vigência: CPC/2015 (Art. 219)</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Painel de Filtros e Configurações */}
        <div className="lg:col-span-1">
          <Card className="border border-white/10 bg-neutral-950/70 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-amber-200 mb-6 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-amber-400" />
              Parâmetros do Prazo
            </h2>
            <form onSubmit={handleCalcular} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Data da Publicação/Intimação
                </label>
                <input
                  type="date"
                  value={dataPublicacao}
                  onChange={(e) => setDataPublicacao(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                />
                <span className="text-[10px] text-neutral-500 mt-1.5 block leading-normal">
                  Esta é a data disponibilizada no diário. A contagem iniciará no primeiro dia útil subsequente.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Quantidade de Dias (Úteis)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={dias}
                  onChange={(e) => setDias(parseInt(e.target.value, 10) || 0)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                />
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4">
                <input
                  id="recesso"
                  type="checkbox"
                  checked={incluirRecesso}
                  onChange={(e) => setIncluirRecesso(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/10 bg-neutral-900 text-amber-400 focus:ring-amber-400/50 focus:ring-offset-neutral-950"
                />
                <div className="leading-tight">
                  <label htmlFor="recesso" className="text-xs font-bold text-neutral-200 cursor-pointer">
                    Recesso Forense (Art. 220 CPC)
                  </label>
                  <p className="text-[10px] text-neutral-400 mt-1 leading-normal">
                    Suspende a contagem de prazos entre 20 de dezembro e 20 de janeiro.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-neutral-950 transition-all hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-500"
              >
                {loading ? 'Calculando prazo...' : 'Calcular Vencimento'}
              </button>
            </form>
          </Card>
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-2">
          {error && (
            <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Erro no cálculo</p>
                <p className="mt-1 text-xs opacity-90">{error}</p>
              </div>
            </div>
          )}

          {!resultado && !error && !loading && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-neutral-950/30 text-neutral-500">
              <CalendarIcon className="h-10 w-10 text-neutral-600 mb-3" />
              <p className="text-sm font-medium">Insira os parâmetros ao lado e clique em calcular.</p>
              <p className="text-xs mt-1 opacity-70">A calculadora verificará feriados nacionais e recessos oficiais.</p>
            </div>
          )}

          {loading && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/5 bg-neutral-950/20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="text-sm text-neutral-400 mt-4">Processando calendário forense...</p>
            </div>
          )}

          {resultado && (
            <div className="space-y-6">
              {/* Cartão de Destaque */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-neutral-950/50 to-transparent p-6 shadow-[0_15px_30px_rgba(251,191,36,0.06)]">
                <div className="absolute top-0 right-0 h-32 w-32 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400/70">Data de Vencimento (Dies ad quem)</span>
                    <h3 className="text-4xl font-extrabold text-amber-300 mt-1 select-all">
                      {formatarDataBR(resultado.dataVencimento)}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-2">
                      Começa em {formatarDataBR(resultado.diesAQuo)} ({resultado.totalDiasUteis} dias úteis contados em {resultado.totalDiasCorridos} dias corridos)
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={copiarRelatorio}
                      className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <ClipboardCopy className="h-4 w-4" />
                      <span>{copied ? 'Copiado!' : 'Copiar Comprovação'}</span>
                    </button>
                    <Link
                      to={`/app/tarefas?new=1&title=Prazo: Analisar intimação&dueAt=${resultado.dataVencimento}T12:00`}
                      className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-neutral-950 transition-all hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      <span>Agendar Prazo no CRM</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Detalhe dia a dia */}
              <Card className="border border-white/10 bg-neutral-950/70 p-6">
                <h3 className="text-md font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-400" />
                  Demonstrativo da Contagem
                </h3>
                
                <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
                  {resultado.detalhes.map((d, index) => {
                    let badgeColor = 'bg-neutral-800 text-neutral-400 border border-neutral-700/50';
                    let rowBorder = 'border-white/5';
                    let icon = <Info className="h-3.5 w-3.5" />;

                    if (d.isUtil) {
                      badgeColor = 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20';
                      rowBorder = 'border-emerald-500/10 bg-emerald-500/5';
                      icon = <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
                    } else if (d.motivo.includes('Feriado')) {
                      badgeColor = 'bg-amber-400/15 text-amber-300 border border-amber-400/20';
                      rowBorder = 'border-amber-500/10 bg-amber-500/5';
                      icon = <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
                    } else if (d.motivo.includes('Recesso')) {
                      badgeColor = 'bg-indigo-400/15 text-indigo-300 border border-indigo-400/20';
                      rowBorder = 'border-indigo-500/10 bg-indigo-500/5';
                      icon = <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />;
                    }

                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between rounded-xl border p-3 text-sm transition-all hover:bg-white/5 ${rowBorder}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-neutral-200 select-all">
                            {formatarDataBR(d.data)}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {d.diaSemana}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${badgeColor}`}>
                            {icon}
                            <span>{d.motivo}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default CalculadoraPrazosPage;
