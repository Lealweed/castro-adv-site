export type ChecklistTemplateItem = {
  title: string;
  description: string;
};

export type ChecklistTemplate = {
  name: string;
  items: ChecklistTemplateItem[];
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
    ]
  }
};
