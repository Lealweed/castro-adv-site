import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import jsPDF from 'jspdf';

import { Card } from '@/ui/widgets/Card';
import { PageHeader } from '@/ui/widgets/PageHeader';
import { centsToBRL } from '@/lib/finance';
import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

type TaskLite = {
  id: string;
  title: string;
  priority: string | null;
  status_v2: string | null;
  due_at: string | null;
  created_at: string | null;
  done_at: string | null;
  assigned_to_user_id: string | null;
};

type FinanceLite = {
  id: string;
  description: string | null;
  type: 'income' | 'expense' | string;
  amount_cents: number;
  occurred_on: string | null;
  due_date: string | null;
  status: string | null;
  created_at: string | null;
};

type AgendaLite = {
  id: string;
  kind: 'deadline' | 'commitment' | string;
  title: string;
  starts_at: string | null;
  due_date: string | null;
};

type CaseLite = {
  id: string;
  title: string;
  status: string | null;
  area: string | null;
  claim_value: number | null;
  responsible_user_id: string | null;
  created_at: string | null;
};

type ProfileLite = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

type AiInsight = {
  level: 'critical' | 'warning' | 'positive';
  title: string;
  detail: string;
  actionLabel?: string;
  actionTo?: string;
};

type PeriodDays = 7 | 30 | 90;

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AiReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [finance, setFinance] = useState<FinanceLite[]>([]);
  const [agenda, setAgenda] = useState<AgendaLite[]>([]);
  const [cases, setCases] = useState<CaseLite[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [clientsCount, setClientsCount] = useState<number>(0);
  const [unreadPubsCount, setUnreadPubsCount] = useState<number>(0);
  const [pendingDocsCount, setPendingDocsCount] = useState<number>(0);

  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('executivo');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [aiResponseText, setAiResponseText] = useState<string>('');
  const [generatingAi, setGeneratingAi] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const sb = requireSupabase();
      await getAuthedUser();

      const today = toDateKey(new Date());

      const [tRes, fRes, aRes, cRes, pRes, clRes, pubRes, chkRes] = await Promise.all([
        sb
          .from('tasks')
          .select('id,title,priority,status_v2,due_at,created_at,done_at,assigned_to_user_id')
          .limit(2000),
        sb
          .from('finance_transactions')
          .select('id,description,type,amount_cents,occurred_on,due_date,status,created_at')
          .limit(2000),
        sb
          .from('agenda_items')
          .select('id,kind,title,starts_at,due_date')
          .or(`and(kind.eq.deadline,due_date.gte.${today}),and(kind.eq.commitment,starts_at.gte.${new Date().toISOString()})`)
          .limit(500),
        sb
          .from('cases')
          .select('id,title,status,area,claim_value,responsible_user_id,created_at')
          .limit(1500),
        sb
          .from('user_profiles')
          .select('user_id,display_name,email')
          .limit(200),
        sb.from('clients').select('id', { count: 'exact', head: true }),
        sb.from('publications').select('id', { count: 'exact', head: true }).eq('is_read', false),
        sb.from('checklist_items').select('id', { count: 'exact', head: true }).eq('status', 'under_analysis'),
      ]);

      if (tRes.error || fRes.error || aRes.error) {
        throw new Error(tRes.error?.message || fRes.error?.message || aRes.error?.message || 'Falha ao carregar dados.');
      }

      setTasks((tRes.data || []) as TaskLite[]);
      setFinance((fRes.data || []) as FinanceLite[]);
      setAgenda((aRes.data || []) as AgendaLite[]);
      setCases((cRes.data || []) as CaseLite[]);
      setProfiles((pRes.data || []) as ProfileLite[]);
      setClientsCount(clRes.count || 0);
      setUnreadPubsCount(pubRes.count || 0);
      setPendingDocsCount(chkRes.count || 0);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar dados para análise de IA.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const report = useMemo(() => {
    const now = Date.now();
    const todayStr = toDateKey(new Date());
    const cutoffMs = now - periodDays * 86400e3;
    const profileMap = new Map(
      profiles.map((p) => [p.user_id, p.display_name || p.email?.split('@')[0] || p.user_id.slice(0, 8)]),
    );

    const openTasks = tasks.filter((t) => !['done', 'cancelled'].includes((t.status_v2 || '').toLowerCase()));
    const createdInPeriod = tasks.filter((t) => (t.created_at ? new Date(t.created_at).getTime() >= cutoffMs : false)).length;
    const doneInPeriod = tasks.filter((t) => (t.done_at ? new Date(t.done_at).getTime() >= cutoffMs : false)).length;

    const overdueTasks = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
    const due48Tasks = openTasks.filter((t) => {
      if (!t.due_at) return false;
      const diff = new Date(t.due_at).getTime() - now;
      return diff >= 0 && diff <= 48 * 3600e3;
    });

    const statusBucket = {
      open: tasks.filter((t) => (t.status_v2 || '').toLowerCase() === 'open').length,
      in_progress: tasks.filter((t) => (t.status_v2 || '').toLowerCase() === 'in_progress').length,
      paused: tasks.filter((t) => (t.status_v2 || '').toLowerCase() === 'paused').length,
      done: tasks.filter((t) => (t.status_v2 || '').toLowerCase() === 'done').length,
      cancelled: tasks.filter((t) => (t.status_v2 || '').toLowerCase() === 'cancelled').length,
    };

    // Análise Financeira no período e geral
    const paidInPeriod = finance.filter((f) => {
      const isPaid = (f.status || '').toLowerCase() === 'paid';
      if (!isPaid) return false;
      const dt = f.occurred_on ? new Date(`${f.occurred_on}T12:00:00`).getTime() : f.created_at ? new Date(f.created_at).getTime() : 0;
      return dt >= cutoffMs;
    });

    const periodIncomeCents = paidInPeriod
      .filter((f) => f.type === 'income')
      .reduce((acc, f) => acc + Number(f.amount_cents || 0), 0);
    const periodExpenseCents = paidInPeriod
      .filter((f) => f.type === 'expense')
      .reduce((acc, f) => acc + Number(f.amount_cents || 0), 0);

    const plannedIncome = finance.filter((f) => f.type === 'income' && (f.status || '').toLowerCase() === 'planned');
    const receivableCents = plannedIncome.reduce((acc, f) => acc + Number(f.amount_cents || 0), 0);
    const overdueIncomeRows = plannedIncome.filter((f) => f.due_date && f.due_date < todayStr);
    const overdueReceivableCents = overdueIncomeRows.reduce((acc, f) => acc + Number(f.amount_cents || 0), 0);

    // Análise de Casos por Área
    const activeCases = cases.filter((c) => !['arquivado', 'encerrado', 'closed'].includes((c.status || '').toLowerCase()));
    const triageCases = cases.filter((c) => (c.status || '').toLowerCase() === 'triagem');
    const areaCounts = new Map<string, { count: number; claimTotal: number }>();
    for (const c of activeCases) {
      const areaName = (c.area || 'Geral / Não classificado').trim();
      const cur = areaCounts.get(areaName) || { count: 0, claimTotal: 0 };
      cur.count += 1;
      cur.claimTotal += Number(c.claim_value || 0);
      areaCounts.set(areaName, cur);
    }
    const topAreas = Array.from(areaCounts.entries())
      .map(([area, stats]) => ({ area, ...stats }))
      .sort((a, b) => b.count - a.count);

    // Produtividade e Gargalos por Membro
    const memberMap = new Map<
      string,
      { name: string; open: number; overdue: number; doneInPeriod: number; activeCases: number }
    >();
    for (const t of tasks) {
      const uid = t.assigned_to_user_id || 'sem_responsavel';
      const name = uid === 'sem_responsavel' ? 'Sem responsável atribuído' : profileMap.get(uid) || uid.slice(0, 8);
      const cur = memberMap.get(uid) || { name, open: 0, overdue: 0, doneInPeriod: 0, activeCases: 0 };
      const st = (t.status_v2 || '').toLowerCase();
      if (!['done', 'cancelled'].includes(st)) {
        cur.open += 1;
        if (t.due_at && new Date(t.due_at).getTime() < now) cur.overdue += 1;
      }
      if (st === 'done' && t.done_at && new Date(t.done_at).getTime() >= cutoffMs) {
        cur.doneInPeriod += 1;
      }
      memberMap.set(uid, cur);
    }
    for (const c of activeCases) {
      if (!c.responsible_user_id) continue;
      const uid = c.responsible_user_id;
      const name = profileMap.get(uid) || uid.slice(0, 8);
      const cur = memberMap.get(uid) || { name, open: 0, overdue: 0, doneInPeriod: 0, activeCases: 0 };
      cur.activeCases += 1;
      memberMap.set(uid, cur);
    }
    const teamPerformance = Array.from(memberMap.values()).sort((a, b) => b.overdue - a.overdue || b.open - a.open);

    // Score de Saúde Operacional (0 a 100)
    let healthScore = 100;
    if (overdueTasks.length > 0) healthScore -= Math.min(30, overdueTasks.length * 4);
    if (unreadPubsCount > 0) healthScore -= Math.min(20, unreadPubsCount * 3);
    if (pendingDocsCount > 0) healthScore -= Math.min(15, pendingDocsCount * 3);
    if (overdueIncomeRows.length > 0) healthScore -= Math.min(20, overdueIncomeRows.length * 4);
    if (createdInPeriod > doneInPeriod + 5) healthScore -= 10;
    healthScore = Math.max(15, Math.min(100, healthScore));

    // Insights Automáticos da IA
    const insights: AiInsight[] = [];

    if (unreadPubsCount > 0) {
      insights.push({
        level: 'critical',
        title: `${unreadPubsCount} intimação(ões) do Diário Oficial (PJe) não lida(s)`,
        detail: 'Há publicações judiciais pendentes de leitura. Risco elevado de perda de prazo processual caso não sejam triadas hoje.',
        actionLabel: 'Abrir PJe / Intimações',
        actionTo: '/app/publicacoes',
      });
    }

    if (overdueTasks.length > 0) {
      const topBottleneck = teamPerformance[0];
      insights.push({
        level: 'critical',
        title: `${overdueTasks.length} tarefa(s) com SLA violado (atrasadas)`,
        detail: topBottleneck && topBottleneck.overdue > 0
          ? `Maior concentração de atrasos está com "${topBottleneck.name}" (${topBottleneck.overdue} atrasada(s) de ${topBottleneck.open} em aberto). Recomenda-se redistribuição no Kanban.`
          : 'Existem tarefas com prazo vencido que precisam de baixa ou repactuação imediata.',
        actionLabel: 'Auditar Kanban',
        actionTo: '/app/tarefas/kanban',
      });
    }

    if (overdueReceivableCents > 0) {
      insights.push({
        level: 'warning',
        title: `${centsToBRL(overdueReceivableCents)} em honorários vencidos (${overdueIncomeRows.length} parcela(s))`,
        detail: 'Existem parcelas previstas cuja data de vencimento já passou sem baixa de pagamento. Sincronize com o Asaas ou acione a cobrança dos clientes.',
        actionLabel: 'Ir para Financeiro',
        actionTo: '/app/financeiro',
      });
    }

    if (pendingDocsCount > 0) {
      insights.push({
        level: 'warning',
        title: `${pendingDocsCount} documento(s) enviado(s) no Portal VIP aguardando revisão`,
        detail: 'Clientes enviaram documentos para o checklist e estão aguardando aprovação ou solicitação de ajuste da equipe.',
        actionLabel: 'Revisar no Smart Drive',
        actionTo: '/app/drive',
      });
    }

    if (createdInPeriod > 0 && doneInPeriod >= createdInPeriod) {
      insights.push({
        level: 'positive',
        title: `Vazão positiva da esteira (${doneInPeriod} concluídas vs. ${createdInPeriod} criadas)`,
        detail: `Nos últimos ${periodDays} dias, a equipe concluiu100% ou mais da demanda gerada, reduzindo o estoque de pendências.`,
      });
    } else if (createdInPeriod > doneInPeriod) {
      insights.push({
        level: 'warning',
        title: `Acúmulo de fila nos últimos ${periodDays} dias (${createdInPeriod} criadas vs. ${doneInPeriod} concluídas)`,
        detail: `O ritmo de entrada superou as conclusões em ${createdInPeriod - doneInPeriod} tarefa(s). Monitore as tarefas pausadas (${statusBucket.paused}).`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        level: 'positive',
        title: 'Operação jurídica estável e sem alertas críticos',
        detail: 'Não há tarefas com SLA violado, intimações pendentes ou gargalos críticos detectados no momento.',
      });
    }

    const upcomingAgenda = agenda
      .map((a) => ({
        ...a,
        ts:
          a.kind === 'deadline'
            ? new Date(`${a.due_date}T00:00:00`).getTime()
            : a.starts_at
              ? new Date(a.starts_at).getTime()
              : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 6);

    return {
      healthScore,
      createdInPeriod,
      doneInPeriod,
      openCount: openTasks.length,
      overdueCount: overdueTasks.length,
      due48Count: due48Tasks.length,
      overdueTasks: overdueTasks.slice(0, 8),
      periodIncomeCents,
      periodExpenseCents,
      netCents: periodIncomeCents - periodExpenseCents,
      receivableCents,
      overdueReceivableCents,
      overdueIncomeCount: overdueIncomeRows.length,
      activeCasesCount: activeCases.length,
      triageCasesCount: triageCases.length,
      topAreas,
      teamPerformance,
      statusBucket,
      upcomingAgenda,
      insights,
    };
  }, [tasks, finance, agenda, cases, profiles, periodDays, unreadPubsCount, pendingDocsCount]);

  function buildAiNarrative(promptType: string, customQuestion?: string): string {
    const todayFormatted = new Date().toLocaleDateString('pt-BR');
    const topArea = report.topAreas[0];
    const teamLines =
      report.teamPerformance.length > 0
        ? report.teamPerformance
            .map(
              (m) =>
                `  • ${m.name}: ${m.open} tarefa(s) em aberto | ${m.overdue} atrasada(s) | ${m.doneInPeriod} concluída(s) no período | ${m.activeCases} caso(s) ativo(s)`,
            )
            .join('\n')
        : '  • Sem tarefas distribuídas por membro até o momento.';

    if (promptType === 'equipe') {
      return `PARECER DE IA — AUDITORIA DE PRODUTIVIDADE E GARGALOS DA EQUIPE (${todayFormatted})
====================================================================
1. DIAGNÓSTICO DE CARGA DE TRABALHO (ÚLTIMOS ${periodDays} DIAS)
• Score de Saúde Operacional: ${report.healthScore}/100
• Demanda criada no período: ${report.createdInPeriod} tarefa(s)
• Entregas concluídas no período: ${report.doneInPeriod} tarefa(s)
• Taxa de vazão da esteira: ${report.createdInPeriod > 0 ? Math.round((report.doneInPeriod / report.createdInPeriod) * 100) : 100}%
• Estoque atual: ${report.openCount} em aberto (${report.overdueCount} atrasada(s), ${report.due48Count} vencendo em 48h, ${report.statusBucket.paused} pausada(s))

2. DISTRIBUIÇÃO NOMINAL POR COLABORADOR
${teamLines}

3. PLANO DE AÇÃO RECOMENDADO PELA IA
${
  report.overdueCount > 0
    ? `• Prioridade 1: Realizar mutirão ou redistribuição das ${report.overdueCount} tarefa(s) com SLA vencido.`
    : '• Prioridade 1: Manter o SLA atual — nenhuma tarefa encontra-se atrasada.'
}
${
  report.statusBucket.paused > 0
    ? `• Prioridade 2: Auditar as ${report.statusBucket.paused} tarefa(s) com status "Pausado" para destravar dependências de documentos de clientes.`
    : '• Prioridade 2: Fluxo sem tarefas travadas em pausa.'
}
• Prioridade 3: Revisar as ${report.due48Count} tarefa(s) que vencem nas próximas 48 horas antes do fechamento do expediente.`;
    }

    if (promptType === 'financeiro') {
      return `PARECER DE IA — INTELIGÊNCIA FINANCEIRA E INADIMPLÊNCIA (${todayFormatted})
====================================================================
1. RESULTADO REALIZADO (ÚLTIMOS ${periodDays} DIAS)
• Receitas Recebidas (Pagas): ${centsToBRL(report.periodIncomeCents)}
• Despesas Liquidadas (Pagas): ${centsToBRL(report.periodExpenseCents)}
• Resultado Líquido de Caixa: ${centsToBRL(report.netCents)}

2. CARTEIRA A RECEBER & RISCO DE INADIMPLÊNCIA
• Total de Honorários Previstos (A Receber): ${centsToBRL(report.receivableCents)}
• Parcelas em Atraso (Vencidas e não pagas): ${centsToBRL(report.overdueReceivableCents)} (${report.overdueIncomeCount} lançamento(s))
• Índice de Inadimplência da Carteira Aberta: ${
        report.receivableCents > 0 ? Math.round((report.overdueReceivableCents / report.receivableCents) * 100) : 0
      }%

3. RECOMENDAÇÕES FINANCEIRAS
• Executar a sincronização com o Asaas para confirmar eventuais pagamentos via PIX/Boleto já compensados.
${
  report.overdueReceivableCents > 0
    ? `• Acionar cobrança preventiva para as ${report.overdueIncomeCount} parcela(s) vencidas, totalizando ${centsToBRL(report.overdueReceivableCents)}.`
    : '• Carteira a receber 100% em dia (zero inadimplência vencida).'
}`;
    }

    if (promptType === 'riscos') {
      return `PARECER DE IA — AUDITORIA DE RISCO PROCESSUAL E CONTROLADORIA (${todayFormatted})
====================================================================
1. RADAR DE ALERTAS CRÍTICOS
• Intimações do PJe (Diário Oficial) não lidas: ${unreadPubsCount}
• Documentos de clientes aguardando revisão no Smart Drive: ${pendingDocsCount}
• Tarefas vencidas (SLA violado): ${report.overdueCount}
• Tarefas críticas (vencimento em até 48h): ${report.due48Count}
• Processos em fase de Triagem inicial: ${report.triageCasesCount}

2. PRÓXIMOS COMPROMISSOS E PRAZOS FATAIS NA AGENDA
${
  report.upcomingAgenda.length > 0
    ? report.upcomingAgenda
        .map(
          (a) =>
            `  • [${a.kind === 'deadline' ? 'PRAZO' : 'COMPROMISSO'}] ${a.title} — ${
              a.kind === 'deadline' ? a.due_date : a.starts_at ? new Date(a.starts_at).toLocaleString('pt-BR') : '—'
            }`,
        )
        .join('\n')
    : '  • Nenhum prazo fatal ou audiência registrada na agenda para os próximos dias.'
}

3. DIRETRIZ DA CONTROLADORIA JURÍDICA
${
  unreadPubsCount > 0
    ? `• URGENTE: Ler e vincular as ${unreadPubsCount} publicação(ões) no módulo PJe / Intimações e calcular o prazo CPC/2015.`
    : '• Diário Oficial PJe em dia (todas as intimações foram lidas).'
}
${
  pendingDocsCount > 0
    ? `• Validar os ${pendingDocsCount} documento(s) na Fila de Aprovações do Smart Drive para não atrasar o protocolo de iniciais.`
    : '• Fila de aprovação de documentos do Portal VIP zerada.'
}`;
    }

    // Default / Executivo / Custom
    return `RELATÓRIO EXECUTIVO DE INTELIGÊNCIA JURÍDICA — CASTRO & OLIVEIRA ADVOCACIA
Data da Análise: ${todayFormatted} | Janela Analisada: Últimos ${periodDays} dias
${customQuestion ? `Consulta Específica: "${customQuestion}"\n` : ''}====================================================================

1. SCORE DE SAÚDE OPERACIONAL DO ESCRITÓRIO: ${report.healthScore}/100
• Base Ativa: ${clientsCount} cliente(s) cadastrado(s) | ${report.activeCasesCount} processo(s) ativo(s) (${report.triageCasesCount} em triagem)
${topArea ? `• Principal Área Jurídica: ${topArea.area} (${topArea.count} processo(s))` : ''}

2. DESEMPENHO OPERACIONAL & ESTEIRA DE TAREFAS
• Criadas no período: ${report.createdInPeriod} | Concluídas: ${report.doneInPeriod}
• Em aberto hoje: ${report.openCount} | Atrasadas (SLA): ${report.overdueCount} | Vencem em 48h: ${report.due48Count}
• Intimações PJe não lidas: ${unreadPubsCount} | Documentos aguardando aprovação no Drive: ${pendingDocsCount}

3. SÍNTESE FINANCEIRA (${periodDays} DIAS)
• Receitas Recebidas: ${centsToBRL(report.periodIncomeCents)} | Despesas Pagas: ${centsToBRL(report.periodExpenseCents)}
• Saldo Líquido do Período: ${centsToBRL(report.netCents)}
• Carteira A Receber: ${centsToBRL(report.receivableCents)} (Sendo ${centsToBRL(report.overdueReceivableCents)} em atraso)

4. PRODUTIVIDADE POR COLABORADOR
${teamLines}

5. RECOMENDAÇÕES PRIORITÁRIAS DA IA PARA A GESTÃO
${report.insights.map((ins, i) => `  ${i + 1}. [${ins.level === 'critical' ? 'CRÍTICO' : ins.level === 'warning' ? 'ATENÇÃO' : 'DESTAQUE'}] ${ins.title}: ${ins.detail}`).join('\n')}`;
  }

  useEffect(() => {
    if (!loading) {
      setAiResponseText(buildAiNarrative(selectedPromptKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, periodDays, selectedPromptKey, tasks.length, finance.length, cases.length]);

  function handleRunPrompt(key: string, question?: string) {
    setGeneratingAi(true);
    setSelectedPromptKey(key);
    setTimeout(() => {
      setAiResponseText(buildAiNarrative(key, question));
      setGeneratingAi(false);
    }, 350);
  }

  function handleCopyReport() {
    if (!aiResponseText) return;
    navigator.clipboard.writeText(aiResponseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleExportPdf() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 17, 23);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(251, 191, 36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CASTRO & OLIVEIRA ADVOCACIA', 14, 14);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Relatório Executivo com Inteligência Artificial — Emitido em ${new Date().toLocaleString('pt-BR')}`, 14, 23);

    doc.setTextColor(30, 30, 30);
    doc.setFont('courier', 'normal');
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(aiResponseText || buildAiNarrative('executivo'), 182);
    let y = 42;
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 5;
    }

    doc.save(`relatorio_ia_castro_oliveira_${toDateKey(new Date())}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        eyebrow="Inteligência"
        accent="indigo"
        title="Inteligência Executiva & Relatórios com IA"
        badge={<span className="badge badge-gold">Motor Ativo</span>}
        subtitle="Diagnóstico automático de gargalos, auditoria de SLA, risco processual (PJe/Drive) e saúde financeira do escritório."
        actions={
          <>
            <div className="inline-flex rounded-xl border border-white/[0.08] bg-slate-950/70 p-1">
              {([7, 30, 90] as PeriodDays[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setPeriodDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    periodDays === d ? 'bg-sky-400 text-slate-950' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {d} dias
                </button>
              ))}
            </div>

            <button
              onClick={() => void loadData()}
              disabled={loading}
              className="btn-ghost !py-2 !text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Atualizar Dados
            </button>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      {/* KPIs Executivos */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-amber-400/25 bg-gradient-to-br from-amber-400/10 to-white/5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-amber-200/80">
            <span>Saúde Operacional</span>
            <TrendingUp className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white">
            {loading ? '—' : `${report.healthScore}/100`}
          </div>
          <div className="mt-1 text-[11px] text-white/60">
            {report.healthScore >= 80 ? 'Operação saudável' : report.healthScore >= 60 ? 'Atenção aos gargalos' : 'Ação imediata requerida'}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Vazão ({periodDays}d)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? '—' : `${report.doneInPeriod} / ${report.createdInPeriod}`}
          </div>
          <div className="mt-1 text-[11px] text-white/50">Concluídas vs. Criadas</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Risco de SLA</span>
            <Clock className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-200">
            {loading ? '—' : `${report.overdueCount} atrasadas`}
          </div>
          <div className="mt-1 text-[11px] text-amber-200/80">{report.due48Count} vencem em 48h</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Caixa Líquido ({periodDays}d)</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className={`mt-2 text-xl font-bold ${report.netCents >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {loading ? '—' : centsToBRL(report.netCents)}
          </div>
          <div className="mt-1 text-[11px] text-white/50">A receber: {centsToBRL(report.receivableCents)}</div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Alertas PJe / Drive</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {loading ? '—' : unreadPubsCount + pendingDocsCount}
          </div>
          <div className="mt-1 text-[11px] text-white/50">
            {unreadPubsCount} PJe · {pendingDocsCount} docs no Drive
          </div>
        </Card>
      </div>

      {/* Diagnósticos Automáticos da IA */}
      <Card className="border-white/15">
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          <Bot className="h-5 w-5 text-amber-400" />
          <span>Diagnósticos Automáticos & Recomendações da IA</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {report.insights.map((ins, idx) => {
            const borderCls =
              ins.level === 'critical'
                ? 'border-red-500/30 bg-red-500/10 text-red-100'
                : ins.level === 'warning'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
                  : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
            return (
              <div key={idx} className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${borderCls}`}>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    {ins.level === 'critical' ? (
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    ) : ins.level === 'warning' ? (
                      <Clock className="h-4 w-4 text-amber-300 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                    <span>{ins.title}</span>
                  </div>
                  <p className="text-xs opacity-85 leading-relaxed">{ins.detail}</p>
                </div>
                {ins.actionTo && ins.actionLabel ? (
                  <div>
                    <Link
                      to={ins.actionTo}
                      className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/50"
                    >
                      {ins.actionLabel} →
                    </Link>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Gerador Interativo de Pareceres & Relatórios com IA */}
      <Card className="border-amber-400/25 bg-neutral-950/80">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-white">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Assistente Gerador de Pareceres Executivos (IA)</span>
            </div>
            <p className="mt-0.5 text-xs text-white/60">
              Selecione o foco da análise abaixo ou faça uma pergunta para gerar um relatório pronto para reunião de sócios ou exportação em PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopyReport} className="btn-ghost flex items-center gap-1.5 !py-2 !text-xs">
              <ClipboardCopy className="h-3.5 w-3.5" />
              {copied ? 'Copiado!' : 'Copiar Parecer'}
            </button>
            <button onClick={handleExportPdf} className="btn-primary flex items-center gap-1.5 !py-2 !text-xs">
              <Download className="h-3.5 w-3.5" />
              Exportar PDF Oficial
            </button>
          </div>
        </div>

        {/* Botões de Skills da IA */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: 'executivo', label: 'Parecer Executivo Completo', icon: BarChart3 },
            { key: 'equipe', label: 'Gargalos & Produtividade da Equipe', icon: Users },
            { key: 'financeiro', label: 'Diagnóstico Financeiro & Inadimplência', icon: Wallet },
            { key: 'riscos', label: 'Auditoria de Riscos (PJe, Prazos & Drive)', icon: Scale },
          ].map((btn) => {
            const SkillIcon = btn.icon;
            return (
              <button
                key={btn.key}
                onClick={() => handleRunPrompt(btn.key)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  selectedPromptKey === btn.key
                    ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-400/15'
                    : 'border border-white/[0.08] bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                }`}
              >
                <SkillIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Pergunta Personalizada */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!customPrompt.trim()) return;
            handleRunPrompt('executivo', customPrompt.trim());
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ou digite um foco específico para o relatório (ex: Pauta para reunião semanal da equipe)..."
            className="input !mt-0 flex-1 !text-xs"
          />
          <button
            type="submit"
            disabled={generatingAi || !customPrompt.trim()}
            className="btn-ghost flex items-center gap-1.5 !text-xs border-amber-400/30 text-amber-200"
          >
            <Send className="h-3.5 w-3.5" />
            Gerar com IA
          </button>
        </form>

        {/* Saída do Parecer */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-5">
          {generatingAi ? (
            <div className="py-12 text-center text-sm text-amber-200 animate-pulse">
              Processando indicadores do escritório e redigindo parecer executivo...
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/90 select-all">
              {aiResponseText}
            </pre>
          )}
        </div>
      </Card>

      {/* Tabelas de Apoio: Carga por Membro & Carteira por Área */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-amber-400" />
            <span>Produtividade & SLA por Colaborador</span>
          </div>
          <div className="mt-3 space-y-2">
            {report.teamPerformance.length === 0 ? (
              <div className="text-sm text-white/50">Nenhuma tarefa atribuída.</div>
            ) : (
              report.teamPerformance.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-white">{m.name}</div>
                    <div className="text-white/50 mt-0.5">{m.activeCases} caso(s) sob responsabilidade</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-white/10 text-white/80">{m.open} abertas</span>
                    <span className="badge border-emerald-400/30 bg-emerald-400/10 text-emerald-200">{m.doneInPeriod} concluídas</span>
                    {m.overdue > 0 ? (
                      <span className="badge border-red-400/30 bg-red-400/10 text-red-200">{m.overdue} atrasadas</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Briefcase className="h-4 w-4 text-amber-400" />
            <span>Carteira de Processos Ativos por Área Jurídica</span>
          </div>
          <div className="mt-3 space-y-2">
            {report.topAreas.length === 0 ? (
              <div className="text-sm text-white/50">Nenhum processo ativo cadastrado.</div>
            ) : (
              report.topAreas.map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs">
                  <span className="font-semibold text-white">{a.area}</span>
                  <div className="flex items-center gap-3">
                    {a.claimTotal > 0 ? (
                      <span className="text-white/50">
                        Valor causas: {a.claimTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    ) : null}
                    <span className="badge badge-gold">{a.count} processo(s)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Próximos Compromissos e Prazos */}
      <Card>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Calendar className="h-4 w-4 text-amber-400" />
          <span>Próximos Compromissos e Prazos Fatais na Agenda</span>
        </div>
        {loading ? (
          <div className="mt-3 text-sm text-white/70">Carregando…</div>
        ) : report.upcomingAgenda.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {report.upcomingAgenda.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white">{a.title}</span>
                  <span className="badge">{a.kind === 'deadline' ? 'Prazo' : 'Compromisso'}</span>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  {a.kind === 'deadline'
                    ? `Vencimento: ${a.due_date || '—'}`
                    : `Início: ${a.starts_at ? new Date(a.starts_at).toLocaleString('pt-BR') : '—'}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-white/60">Sem itens futuros registrados na agenda no momento.</div>
        )}
      </Card>
    </div>
  );
}
