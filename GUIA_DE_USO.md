# Guia de Uso: Sistema de Checklists, Versionamento e Portal VIP

Este guia descreve o funcionamento ponta a ponta do novo fluxo de recebimento, classificação e validação de documentos de clientes integrado ao CRM.

---

## 1. Fluxo do Escritório (Advogadas & Equipe)

### Passo 1.1: Configurando o Checklist do Processo
Para solicitar documentos a um cliente, acesse o painel administrativo:
1. Vá até o menu **Clientes** e selecione o perfil do cliente desejado.
2. Na ficha do cliente, localize o **Processo (Caso)** correspondente.
3. Abra a aba **Smart Drive & Contratos** e clique na sub-aba **Checklist Caso**.
4. Você terá duas opções para gerar a lista:
   * **Aplicar Modelo Padrão**: Clique em *Carregar Modelo* e selecione um modelo predefinido (ex: *Usucapião Extrajudicial*, *Divórcio Consensual*, *Defesa Trabalhista*, *Ação de Alimentos*).
   * **Criar Item Manual**: Se precisar de um documento específico não listado no modelo, preencha o campo de texto no topo e clique em *Adicionar Item*.

### Passo 1.2: Acompanhando o Envio do Cliente
* Os itens listados no checklist possuem indicadores coloridos de status:
  * 🔴 **Pendente**: O cliente ainda não enviou o documento.
  * 🟡 **Em Análise**: O cliente enviou o arquivo e está aguardando sua aprovação.
  * 🟢 **Aprovado**: O documento foi revisado e aceito pelo escritório.
  * 🟠 **Corrigir**: O documento foi rejeitado pela advogada e o cliente precisa enviar um novo arquivo.

### Passo 1.3: Revisando e Validando Documentos (Interface do Caso)
Ao lado de qualquer item marcado como `🟡 Em Análise`:
1. Clique no ícone de **Download** para inspecionar o arquivo.
2. Se estiver correto, clique no botão **Aprovar (Check verde)**. O status mudará para `🟢 Aprovado` e o documento ficará fixo no cofre.
3. Se houver problemas (ex: foto tremida, comprovante antigo):
   * Clique no botão **Recusar / Solicitar Ajustes (X vermelho)**.
   * Escreva o motivo detalhado da rejeição (ex: *"O comprovante de residência deve ser dos últimos 3 meses"*).
   * O status mudará para `🟠 Corrigir` e o cliente receberá este aviso no portal dele.

### Passo 1.4: Auditoria e Histórico de Versões
Se o cliente enviar uma correção ou alteração de documento:
1. O sistema não apaga o arquivo antigo. Ele cria a versão 2 (`v2`), mantendo o arquivo anterior oculto como histórico.
2. Clique no ícone de **Histórico (Relógio)** ao lado do documento na listagem.
3. Um modal abrirá exibindo todas as versões enviadas anteriormente, quem enviou, a data de upload e a justificativa da substituição.

---

## 2. Fila Global de Aprovações (Central de Controle)

Para otimizar o dia a dia e evitar que você tenha que abrir o perfil de cada cliente individualmente para checar novos uploads:
1. No menu principal da lateral esquerda, acesse a página **Drive** (Cofre Digital & Drive Central).
2. No topo, você verá **Métricas Rápidas** que resumem a carga de trabalho de documentos do escritório.
3. Selecione a aba **Fila de Aprovações**.
4. Esta tela exibirá uma tabela consolidada com **todos os documentos de todos os clientes** que estão atualmente com o status `🟡 Em Análise` (aguardando revisão).
5. Diretamente por esta fila, você pode:
   * Ver qual é o Cliente e qual o Processo.
   * Baixar o arquivo enviado.
   * Clicar no botão **Aprovar** ou **Recusar** (solicitando correção e adicionando comentários).

---

## 3. Fluxo do Cliente (Portal VIP)

### Passo 3.1: Acesso Seguro
1. O cliente entra na URL do site e clica no botão para acessar o **Portal do Cliente**.
2. Ele realiza a autenticação digitando seu **CPF** (apenas números) e o **PIN** (senha temporária de 6 dígitos gerada no cadastro dele dentro do CRM).

### Passo 3.2: Enviando Documentos
1. No menu principal do portal, o cliente clica na aba **Pendências**.
2. Se ele possuir mais de um processo ativo, haverá um seletor para ele escolher qual processo quer consultar.
3. Ele visualizará a lista de documentos necessários.
4. Para enviar, basta ele clicar no botão **Anexar Documento** na linha correspondente da pendência, selecionar o arquivo (PDF, imagem ou foto tirada no celular) e confirmar.
5. O sistema mudará o status visual do documento dele para `Aguardando Revisão`.

### Passo 3.3: Visualizando Correções Solicitadas
1. Se a advogada rejeitar algum documento, o cliente verá o status do item atualizado para `Corrigir`.
2. Um box explicativo em destaque laranja exibirá a justificativa inserida pela advogada (ex: *"A foto do RG ficou cortada, favor reenviar"*).
3. O cliente pode clicar novamente em **Anexar Documento** para enviar a versão corrigida.
