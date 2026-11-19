import { requireSupabase } from '@/lib/supabaseDb';

export type DataJudLastMovement = {
  last_movement_text: string | null;
  last_movement_at: string | null;
  tribunal?: string;
};

export type BrasilApiProcesso = {
  numero: string;
  tribunal: string;
  ultimoAndamento: string;
  dataUltimoAndamento: string;
  status: string;
  source: 'escavador' | 'datajud' | 'crm';
  warning?: string;
};

function sanitizeCnj(cnj: string) {
  return (cnj || '').replace(/\D/g, '');
}

function formatCnj(cnjDigits: string) {
  if (cnjDigits.length !== 20) return cnjDigits;
  return cnjDigits.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
}

function inferTribunalFromCnj(cnjDigits: string): string {
  if (cnjDigits.length !== 20) return 'Tribunal Nacional';
  const j = cnjDigits.slice(13, 14);
  const tr = cnjDigits.slice(14, 16);
  const stateCourts: Record<string, string> = {
    '01': 'TJAC', '02': 'TJAL', '03': 'TJAP', '04': 'TJAM', '05': 'TJBA',
    '06': 'TJCE', '07': 'TJDFT', '08': 'TJES', '09': 'TJGO', '10': 'TJMA',
    '11': 'TJMT', '12': 'TJMS', '13': 'TJMG', '14': 'TJPA', '15': 'TJPB',
    '16': 'TJPR', '17': 'TJPE', '18': 'TJPI', '19': 'TJRJ', '20': 'TJRN',
    '21': 'TJRS', '22': 'TJRO', '23': 'TJRR', '24': 'TJSC', '25': 'TJSE',
    '26': 'TJSP', '27': 'TJTO',
  };
  if (j === '8') return stateCourts[tr] || `TJ-${tr}`;
  if (j === '5') return `TRT-${Number(tr)}`;
  if (j === '4') return `TRF-${Number(tr)}`;
  if (j === '6') return `TRE-${tr}`;
  return `CNJ (${j}.${tr})`;
}

type EscavadorNode = Record<string, unknown>;

function pickProcessRoot(payload: EscavadorNode): EscavadorNode {
  const data = payload.data;
  if (Array.isArray(data)) {
    return ((data[0] as EscavadorNode | undefined) || payload) as EscavadorNode;
  }
  if (data && typeof data === 'object') {
    return data as EscavadorNode;
  }
  return payload;
}

function readMovementText(node: EscavadorNode) {
  const candidates = [
    node['texto'],
    node['nome'],
    node['descricao'],
    node['descricao_texto'],
    node['conteudo'],
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value.trim() : 'Sem movimentação disponível';
}

function readMovementDate(node: EscavadorNode) {
  const candidates = [
    node['data'],
    node['data_hora'],
    node['data_movimentacao'],
    node['data_publicacao'],
    node['created_at'],
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return typeof value === 'string' ? value : new Date().toISOString();
}

function pickLastMovement(processo: EscavadorNode) {
  const fromUltima = processo['ultima_movimentacao'];
  if (fromUltima && typeof fromUltima === 'object' && !Array.isArray(fromUltima)) {
    return fromUltima as EscavadorNode;
  }

  const movimentacoes = processo['movimentacoes'];
  if (Array.isArray(movimentacoes) && movimentacoes.length > 0) {
    const parsed = movimentacoes.filter((item): item is EscavadorNode => Boolean(item && typeof item === 'object'));
    if (!parsed.length) return null;
    return parsed.sort((left, right) => {
      const leftTime = new Date(readMovementDate(left)).getTime();
      const rightTime = new Date(readMovementDate(right)).getTime();
      return rightTime - leftTime;
    })[0];
  }

  return null;
}

export async function fetchEscavadorProcesso(cnj: string): Promise<BrasilApiProcesso> {
  const cnjLimpo = sanitizeCnj(cnj);
  const apiKey =
    (import.meta.env.VITE_ESCAVADOR_API_KEY as string | undefined) ||
    (import.meta.env.VITE_ESCAVADOR_API_TOKEN as string | undefined);

  if (cnjLimpo.length !== 20) {
    throw new Error('Informe um CNJ válido com 20 dígitos.');
  }

  const formattedCnj = formatCnj(cnjLimpo);
  const inferredTribunal = inferTribunalFromCnj(cnjLimpo);

  // 1) Se a chave do Escavador estiver configurada, tenta no Escavador primeiro
  if (apiKey) {
    try {
      const resp = await fetch(`https://api.escavador.com/api/v2/processos/numero_cnj/${cnjLimpo}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const payload = (await resp.json().catch(() => null)) as EscavadorNode | null;
      if (resp.ok && payload) {
        const processo = pickProcessRoot(payload);
        const tribunalNode = processo['tribunal'];
        const tribunal =
          tribunalNode && typeof tribunalNode === 'object' && typeof (tribunalNode as EscavadorNode)['sigla'] === 'string'
            ? String((tribunalNode as EscavadorNode)['sigla'])
            : inferredTribunal;

        const lastMovement = pickLastMovement(processo);
        const ultimoAndamento = lastMovement ? readMovementText(lastMovement) : 'Sem movimentação disponível';
        const dataUltimoAndamento = lastMovement ? readMovementDate(lastMovement) : new Date().toISOString();
        const status = typeof processo['status'] === 'string' && processo['status'] ? String(processo['status']) : 'Consulta Escavador';

        return {
          numero: typeof processo['numero_cnj'] === 'string' && processo['numero_cnj'] ? String(processo['numero_cnj']) : formattedCnj,
          tribunal,
          ultimoAndamento,
          dataUltimoAndamento,
          status,
          source: 'escavador',
        };
      }
    } catch {
      // prossegue para fallback DataJud / CRM
    }
  }

  // 2) Fallback Automático 1: Consulta a Edge Function oficial do DataJud (CNJ)
  try {
    const dj = await fetchDatajudLastMovement(formattedCnj);
    if (dj?.last_movement_text) {
      return {
        numero: formattedCnj,
        tribunal: dj.tribunal || inferredTribunal,
        ultimoAndamento: dj.last_movement_text,
        dataUltimoAndamento: dj.last_movement_at || new Date().toISOString(),
        status: 'Consultado via DataJud (CNJ)',
        source: 'datajud',
      };
    }
  } catch {
    // prossegue para fallback local no banco do CRM
  }

  // 3) Fallback Automático 2: Busca nas publicações do PJe e nos casos internos do CRM
  const sb = requireSupabase();
  const [{ data: pubs }, { data: cases }] = await Promise.all([
    sb
      .from('publications')
      .select('sigla_tribunal,tipo_comunicacao,nome_orgao,texto,data_disponibilizacao')
      .or(`numero_processo.eq.${cnjLimpo},numero_processo.eq.${formattedCnj}`)
      .order('data_disponibilizacao', { ascending: false })
      .limit(1),
    sb
      .from('cases')
      .select('title,status,court,datajud_last_movement_text,datajud_last_movement_at,created_at')
      .or(`process_number.eq.${cnjLimpo},process_number.eq.${formattedCnj}`)
      .limit(1),
  ]);

  if (pubs && pubs.length > 0) {
    const p = pubs[0] as any;
    return {
      numero: formattedCnj,
      tribunal: p.sigla_tribunal || inferredTribunal,
      ultimoAndamento: `${p.tipo_comunicacao || 'Publicação'} (${p.nome_orgao || ''}): ${String(p.texto || '').replace(/<[^>]+>/g, '').slice(0, 220)}`,
      dataUltimoAndamento: p.data_disponibilizacao || new Date().toISOString(),
      status: 'Intimação Localizada no PJe',
      source: 'crm',
    };
  }

  if (cases && cases.length > 0) {
    const c = cases[0] as any;
    return {
      numero: formattedCnj,
      tribunal: c.court || inferredTribunal,
      ultimoAndamento: c.datajud_last_movement_text || `Processo cadastrado no CRM: ${c.title}`,
      dataUltimoAndamento: c.datajud_last_movement_at || c.created_at || new Date().toISOString(),
      status: String(c.status || 'Ativo no CRM').toUpperCase(),
      source: 'crm',
    };
  }

  return {
    numero: formattedCnj,
    tribunal: inferredTribunal,
    ultimoAndamento: 'Processo identificado pela numeração CNJ. Nenhuma publicação recente localizada na base local.',
    dataUltimoAndamento: new Date().toISOString(),
    status: `Tribunal Identificado (${inferredTribunal})`,
    source: 'datajud',
    warning: apiKey ? undefined : 'Consulta realizada via identificador CNJ / Base Local (DataJud).',
  };
}

export async function fetchBrasilApiProcesso(cnj: string): Promise<BrasilApiProcesso> {
  return fetchEscavadorProcesso(cnj);
}

export async function fetchDatajudLastMovement(processNumber: string): Promise<DataJudLastMovement> {
  const sb = requireSupabase();
  const { data: sessionData, error: sErr } = await sb.auth.getSession();
  if (sErr) throw new Error(sErr.message);
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sessão inválida. Faça login novamente.');

  const url = `${(sb as unknown as Record<string, unknown>).supabaseUrl}/functions/v1/datajud-last-movement`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ process_number: processNumber }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error || 'Falha ao consultar DataJud.');

  return {
    last_movement_text: json?.last_movement_text ?? null,
    last_movement_at: json?.last_movement_at ?? null,
  };
}

