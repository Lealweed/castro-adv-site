# Manual Completo do Sistema — Castro & Oliveira Advocacia

> Versão atual em produção: https://www.castrodeoliveiraadv.org

---

## O que foi construído e alterado

O sistema passou por três grandes ciclos de desenvolvimento. Abaixo está tudo que existe hoje e como usar cada funcionalidade.

---

## 1. Acesso e Autenticação

### Como usar
- Acesse a plataforma e faça login com seu **e-mail e senha** cadastrados no escritório
- Cada membro da equipe tem um nível de acesso (perfil):

| Perfil | O que pode fazer |
|--------|-----------------|
| `admin` | Acesso total: clientes, casos, financeiro, equipe, auditoria, configurações |
| `advogada` | Clientes, casos, tarefas, agenda, documentos, drive |
| `estagiária` | Tarefas atribuídas, agenda, documentos vinculados |
| `viewer` | Apenas visualização, sem edição |

---

## 2. Dashboard Executivo

**Onde:** Menu lateral → **Dashboard**

### O que está disponível
- **Cards executivos** no topo com os números mais críticos do dia:
  - Casos em Triagem
  - Honorários a Receber (total pendente)
  - Tarefas Pendentes
- **KPIs de tarefas**: Atrasadas, Vencem hoje, Próximas 48h, Pausadas
- **Gráfico Esteira (14 dias)**: compara tarefas criadas vs concluídas — se a linha de criadas estiver sempre acima, a fila está crescendo
- **Gráfico Pizza**: distribuição de tarefas por status (Aberto, Em Andamento, Pausado)
- **Gráfico de Risco**: mostra tarefas Atrasadas, Hoje, 48h e Sem prazo
- **Radar de Processos (Escavador)**: busque qualquer processo pelo número CNJ para ver tribunal, última movimentação e status atual
- **Aba Equipe** (apenas admin): workload por membro, quem tem mais tarefas atrasadas

---

## 3. Clientes

**Onde:** Menu lateral → **Clientes**

### Cadastro e edição
- Cadastre clientes com: nome, CPF, RG, telefone, WhatsApp, e-mail, data de nascimento, estado civil, profissão, nacionalidade e endereço completo
- O campo **"Senha do Portal (PIN)"** define a senha de 6 dígitos que o cliente usará para acessar o Portal VIP

### Ficha do Cliente
Dentro da ficha de cada cliente você encontra:

1. **Informações pessoais** — todos os dados cadastrais
2. **Ações rápidas** — Agendar Reunião, Adicionar Cobrança
3. **Mural / Aviso** — texto que aparece no bloco "Aviso do Advogado" dentro do portal do cliente
4. **Chat do Portal** — histórico de mensagens trocadas com o cliente pelo portal, com opção de responder
5. **Casos vinculados** — lista de processos do cliente com link direto para abrir cada um
6. **Smart Drive & Contratos** — documentos organizados por categoria
7. **Timeline de Auditoria** — histórico de tudo que aconteceu (criações, edições, exclusões, downloads)
8. **Honorários e Parcelas** — lançamentos financeiros vinculados ao cliente

### Como enviar uma mensagem WhatsApp direto da ficha
Na ficha do cliente, ao lado do campo WhatsApp, clique em **💬 Zap** → escreva a mensagem → enviar.

---

## 4. Casos / Processos

**Onde:** Menu lateral → **Casos**

### Informações por processo
- Número CNJ, área jurídica, status, partes envolvidas, descrição
- Documentos do caso
- Tarefas vinculadas
- Lançamentos financeiros do caso
- Timeline de auditoria do caso

### Status disponíveis
`triagem` → `ativo` → `suspenso` → `encerrado` → `arquivado`

---

## 5. Smart Drive & Contratos (Documentos)

**Onde:** Ficha do cliente → aba **Smart Drive & Contratos**

### Abas disponíveis

#### 📁 Documentos Pessoais
- Upload de qualquer arquivo (PDF, imagem, Word)
- Escolha a categoria: RG, CPF, Comprovante de Endereço, Certidão, Contrato etc.
- Marque **"Tornar visível para o Cliente"** para que o arquivo apareça no Portal VIP

#### ⚖️ Documentos do Processo
- Vinculados a um caso específico do cliente
- Mesmas opções de categoria e visibilidade

#### 📋 Checklist do Caso
Como solicitar documentos ao cliente:
1. Clique em **"Carregar Modelo"** para aplicar um modelo pronto (Usucapião, Divórcio, Defesa Trabalhista, Alimentos etc.)
2. Ou adicione itens individuais manualmente no campo de texto
3. O cliente verá essa lista no Portal VIP e poderá enviar os arquivos diretamente

**Status de cada item do checklist:**
| Ícone | Status | Significado |
|-------|--------|-------------|
| 🔴 | Pendente | Cliente ainda não enviou |
| 🟡 | Sob Análise | Arquivo enviado, aguardando revisão |
| 🟢 | Aprovado | Documento aceito |
| 🟠 | Corrigir | Rejeitado, cliente precisa reenviar |

**Para aprovar ou recusar:**
- Clique no ✅ verde para aprovar
- Clique no ❌ vermelho para recusar e escreva o motivo — o cliente verá essa explicação

**Histórico de Versões:**
- Clique no ícone de 🕐 relógio ao lado de qualquer arquivo para ver todas as versões enviadas anteriormente

#### 📄 Modelos Word
- Faça upload de um modelo `.docx` com variáveis como `{nome_cliente}`, `{cpf}`, `{data_atual}`
- Clique em **"Gerar"** para criar um documento preenchido automaticamente com os dados do cliente
- Opção de salvar a cópia gerada no Drive do cliente

---

## 6. Drive Central

**Onde:** Menu lateral → **Drive**

### Métricas rápidas
Cards no topo mostrando: Total de arquivos, Aguardando revisão, Aprovados, Rejeitados

### Aba: Fila de Aprovações ⚡
- Lista **consolidada de todos os clientes** com documentos aguardando revisão
- Sem precisar entrar na ficha de cada cliente individualmente
- Aprove ou rejeite diretamente pela fila, com campo de observação

### Aba: Todos os Documentos
- Visualize, baixe, alterne visibilidade (público/privado) ou exclua qualquer arquivo
- Filtros por cliente, tipo e status

---

## 7. Portal VIP do Cliente

**Como o cliente acessa:**
1. Entra no site e clica no botão do Portal do Cliente
2. Digita o **CPF** (apenas números) e o **PIN** de 6 dígitos definido pela equipe
3. Acessa o portal exclusivo

### O que o cliente vê no Portal

#### 🏠 Home
- Aviso do advogado (mensagem personalizada da equipe)
- Próxima reunião agendada
- Resumo de pendências

#### 📋 Pendências (Checklist)
- Lista de documentos solicitados pelo escritório
- Status de cada item (Pendente / Enviado / Aprovado / Corrigir)
- Botão **"Anexar Documento"** em cada pendência
- Caso haja rejeição, aparece o motivo explicado pela advogada em destaque laranja

#### 💰 Financeiro
- Histórico de cobranças e honorários com status (Pendente / Pago)

#### 💬 Mensagens
- Chat direto com o escritório

---

## 8. Notificações Automáticas (Central de Alertas)

**Onde:** Ícone de sino no topo da plataforma

### Quando o sistema gera notificações automáticas
- ✅ **Cliente envia documento** pelo Portal → notificação "Novo Documento Enviado" aparece para toda a equipe
- ✅ **Tarefas com prazo vencendo** (via agenda e scheduler)
- ✅ **Aniversários de clientes**

### Como usar
- O número vermelho no sino indica notificações não lidas
- Clique para ver o painel → clique em cada notificação para marcar como lida
- Botão "Marcar todas como lidas" disponível

---

## 9. Agenda

**Onde:** Menu lateral → **Agenda**

- Cadastre compromissos (reuniões, audiências) e prazos processuais
- Vincule ao cliente e/ou processo correspondente
- Notificações de lembrete automáticas
- Visualização semanal e mensal

---

## 10. Tarefas

**Onde:** Menu lateral → **Tarefas** ou **Kanban**

- Crie tarefas vinculadas a clientes, casos ou independentes
- Atribua responsável, prazo e prioridade
- Status: Aberto → Em Andamento → Pausado → Concluído
- Anexe arquivos diretamente na tarefa
- Timeline de auditoria por tarefa

---

## 11. Financeiro

**Onde:** Menu lateral → **Financeiro**

- Receitas (honorários) e despesas do escritório
- Lançar honorários por cliente: valor, número de parcelas e data da primeira parcela
- Controle de status: Planejado / Pago / Atrasado
- Gráficos de fluxo de caixa e receitas por período

---

## 12. Auditoria e Segurança (LGPD)

**Onde:** Menu lateral → **Auditoria** (apenas admins)

### O que é registrado automaticamente
| Ação | Exemplo |
|------|---------|
| Criação | "Cliente criado: João Silva" |
| Edição | "Caso atualizado: status alterado de 'triagem' para 'ativo'" |
| Exclusão | "Documento excluído: Certidão de Nascimento" |
| **Download** | "Documento baixado/visualizado: Procuração.docx" ← **NOVO** |

### Como usar
- Filtre por módulo (Clientes, Casos, Financeiro, Documentos, Equipe)
- Filtre por tipo de ação (Criação, Atualização, Exclusão, Download)
- Use a busca livre para encontrar ações específicas
- A **Timeline de Auditoria** na ficha do cliente e do caso mostra apenas os eventos daquele registro específico

---

## 13. Equipe (apenas admin)

**Onde:** Menu lateral → **Equipe**

- Visualize todos os membros com nome, e-mail e perfil de acesso
- Altere permissões diretamente
- Acompanhe workload por membro no Dashboard → aba Equipe

---

## Resumo por Perfil de Uso

### Para a Advogada Responsável
1. Abra o **Dashboard** todo dia de manhã para ver tarefas atrasadas e honorários pendentes
2. Acesse a **Fila de Aprovações** no Drive para revisar documentos enviados pelo portal
3. Use o **Checklist** na ficha de cada processo para solicitar e controlar documentos
4. Responda mensagens dos clientes pelo **Chat do Portal** na ficha do cliente

### Para a Estagiária
1. Acesse **Tarefas** para ver o que está atribuído a você
2. Marque o progresso conforme avança
3. Anexe documentos relevantes diretamente na tarefa

### Para o Cliente
1. Acesse o Portal VIP com CPF e PIN fornecidos pelo escritório
2. Vá em **Pendências** para ver o que foi solicitado
3. Clique em **Anexar Documento** e envie o arquivo
4. Acompanhe o status (Aprovado / Corrigir) e releia o motivo quando houver rejeição
