export type ChecklistTemplateItem = {
  title: string;
  description: string;
};

export type PlaybookTask = {
  title: string;
  description: string;
  daysToDue: number;
  priority: 'low' | 'medium' | 'high';
};

export type ChecklistTemplate = {
  name: string;
  items: ChecklistTemplateItem[];
  tasks?: PlaybookTask[];
};

export const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  usucapiao: {
    name: 'Usucapião Extrajudicial',
    items: [
      { title: 'RG e CPF (ou CNH) do Requerente', description: 'Cópia colorida e legível.' },
      { title: 'Certidão de Casamento/Nascimento', description: 'Atualizada (segunda via de até 90 dias).' },
      { title: 'Comprovante de Residência', description: 'Conta recente de água, luz ou telefone.' },
      { title: 'Planta e Memorial Descritivo', description: 'Assinados por engenheiro/topógrafo com ART/RRT correspondente.' },
      { title: 'IPTU ou Certidão Cadastral', description: 'Espelho do IPTU do ano corrente.' },
      { title: 'Certidões Negativas Cíveis', description: 'Da comarca do imóvel e do domicílio do autor.' },
      { title: 'Comprovantes de Posse (5+ anos)', description: 'Contratos, recibos de IPTU antigos, fotos históricas, notas de reformas.' }
    ],
    tasks: [
      { title: 'Análise documental inicial e certidões', description: 'Revisar RG, CPF, comprovante de residência e certidões recebidas.', daysToDue: 5, priority: 'medium' },
      { title: 'Reunião com engenheiro/topógrafo (Planta)', description: 'Alinhar confecção da planta e memorial descritivo assinado com ART/RRT.', daysToDue: 15, priority: 'high' },
      { title: 'Minutar requerimento de Usucapião', description: 'Redigir a petição fundamentada para entrega no cartório.', daysToDue: 25, priority: 'high' },
      { title: 'Protocolar Usucapião no Cartório de Registro', description: 'Realizar o protocolo e acompanhar a prenotação.', daysToDue: 35, priority: 'medium' }
    ]
  },
  divorcio: {
    name: 'Divórcio Consensual',
    items: [
      { title: 'RG e CPF dos cônjuges', description: 'Cópias coloridas e legíveis.' },
      { title: 'Certidão de Casamento', description: 'Atualizada com averbações (emitida em até 90 dias).' },
      { title: 'Pacto Antenupcial', description: 'Se aplicável, com a certidão de registro.' },
      { title: 'RG e CPF dos Filhos Menores', description: 'Ou Certidão de Nascimento correspondente.' },
      { title: 'Documentos dos Bens Imóveis', description: 'Escritura, matrícula atualizada e espelho de IPTU.' },
      { title: 'Documentos dos Bens Móveis', description: 'CRLV de veículos, extratos de contas e investimentos.' }
    ],
    tasks: [
      { title: 'Minutar petição inicial e termo de divórcio', description: 'Redigir a peça de divórcio contendo a partilha de bens e pensão, se houver.', daysToDue: 5, priority: 'high' },
      { title: 'Revisar documentos dos cônjuges e certidão atualizada', description: 'Verificar certidão de casamento e documentos de bens.', daysToDue: 10, priority: 'medium' },
      { title: 'Colher assinaturas das partes (Contrato e Petição)', description: 'Assinaturas físicas ou digitais das duas partes.', daysToDue: 15, priority: 'medium' },
      { title: 'Protocolar petição de divórcio em juízo', description: 'Protocolar petição no sistema do tribunal correspondente.', daysToDue: 20, priority: 'high' }
    ]
  },
  trabalhista_empresa: {
    name: 'Defesa Trabalhista (Empresa)',
    items: [
      { title: 'Contrato Social e Alterações', description: 'Última alteração consolidada da empresa.' },
      { title: 'Carta de Preposto e Procuração', description: 'Assinadas digitalmente ou fisicamente.' },
      { title: 'Ficha de Registro / CTPS do Reclamante', description: 'Histórico completo de registro na empresa.' },
      { title: 'Controle de Ponto do Reclamante', description: 'Espelhos de ponto de todo o período trabalhado.' },
      { title: 'Recibos de Salário e Férias', description: 'Holerites assinados ou comprovantes de depósito bancário.' },
      { title: 'TRCT e Comprovante de Pagamento', description: 'Termo de rescisão e comprovante do FGTS/multa.' }
    ],
    tasks: [
      { title: 'Solicitar subsídios e cartões de ponto à empresa', description: 'Obter folhas de ponto, holerites e histórico funcional do reclamante.', daysToDue: 3, priority: 'high' },
      { title: 'Minutar contestação trabalhista', description: 'Escrever defesa técnica rebatendo os pedidos da inicial.', daysToDue: 10, priority: 'high' },
      { title: 'Protocolar contestação e documentos no PJe', description: 'Subir contestação e anexos organizados para o tribunal.', daysToDue: 14, priority: 'high' },
      { title: 'Instruir preposto e testemunhas para a audiência', description: 'Fazer reunião prévia para explicar a dinâmica da audiência.', daysToDue: 20, priority: 'medium' }
    ]
  },
  alimentos: {
    name: 'Ação de Alimentos',
    items: [
      { title: 'RG e CPF do Representante', description: 'Cópia legível de quem detém a guarda da criança.' },
      { title: 'Certidão de Nascimento do Menor', description: 'Comprovante essencial do parentesco.' },
      { title: 'Comprovante de Residência recente', description: 'Em nome do representante legal.' },
      { title: 'Comprovantes de Despesas do Menor', description: 'Escola, saúde, alimentação, vestuário, moradia.' },
      { title: 'Indícios de Capacidade do Réu', description: 'Prints de redes sociais, fotos de viagens, holerites antigos.' }
    ],
    tasks: [
      { title: 'Minutar petição inicial de alimentos', description: 'Elaborar peça inicial fundamentando a necessidade e possibilidade.', daysToDue: 5, priority: 'high' },
      { title: 'Coletar comprovantes de despesas e certidão de nascimento', description: 'Organizar recibos de escola, saúde, alimentação e moradia.', daysToDue: 10, priority: 'medium' },
      { title: 'Protocolar ação de alimentos no tribunal', description: 'Protocolar petição e aguardar despacho liminar de alimentos provisórios.', daysToDue: 15, priority: 'high' },
      { title: 'Acompanhar citação do réu', description: 'Verificar se o oficial de justiça localizou o réu.', daysToDue: 30, priority: 'medium' }
    ]
  }
};
