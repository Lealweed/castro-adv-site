# Documentação Oficial de Integração com o n8n — Castro & Oliveira Advocacia

Este guia documenta a arquitetura, autenticação, endpoints da API, Edge Functions do Supabase e estruturas de banco de dados disponíveis para os workflows do **n8n** e **Evolution API (WhatsApp)**.

---

## 1. Autenticação no n8n

1. No painel do CRM, acesse **Menu → Integrações & API (`/app/integracoes`)**.
2. Clique em **"Gerar Chave de Integração (API Key)"**.
3. No **n8n**, em qualquer nó **HTTP Request**, configure o cabeçalho:
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer <SUA_API_KEY>`

---

## 2. Catálogo de Endpoints para Workflows do n8n

### 2.1. Entrada Automática de Leads (WhatsApp / Site → Fila de Triagem)
- **Método & URL:** `POST https://api.castrodeoliveiraadv.org/integrations/n8n/lead`
- **O que faz:**
  - Verifica se o cliente já existe pelo **CPF** ou pelo **WhatsApp/Telefone**.
  - Se não existir, cria o cliente automaticamente na tabela `public.clients` com a tag `[#origem:n8n_whatsapp]`, fazendo-o aparecer imediatamente em **Triagem / Leads (`/app/triagem`)**.
  - Se `"create_case": true` for enviado, já abre o processo vinculando a área do direito (`legal_area`) e o relato do cliente (`case_description`).
- **Payload JSON (Body):**
```json
{
  "name": "Maria da Silva",
  "whatsapp": "5594991234567",
  "cpf": "12345678909",
  "email": "maria@email.com",
  "legal_area": "Trabalhista",
  "case_description": "Relato enviado pelo WhatsApp na triagem inicial.",
  "create_case": true
}
```

---

### 2.2. Radar de Tarefas Atrasadas e SLA 48h (Cobrança no WhatsApp dos Advogados)
- **Método & URL:** `GET https://api.castrodeoliveiraadv.org/integrations/n8n/overdue-tasks`
- **O que faz:**
  - Lista todas as tarefas abertas cujo prazo (`due_at`) já venceu (`OVERDUE`) ou vence nas próximas 48 horas (`DUE_WITHIN_48H`).
  - Já traz os dados do colaborador responsável (`assignee.name`, `assignee.email`, `assignee.whatsapp`) cadastrados em **Configurações → Equipe**.
- **Como usar no n8n:**
  1. Adicione um nó **Schedule Trigger** (ex.: todo dia útil às 08:30).
  2. Adicione um nó **HTTP Request** chamando `GET /integrations/n8n/overdue-tasks`.
  3. Adicione um nó **Split Out** sobre a lista `tasks` e dispare a mensagem de lembrete via **Evolution API** para `{{ $json.assignee.whatsapp }}`.

---

### 2.3. Disparo de Alertas e Eventos do n8n para o Sino do CRM
- **Método & URL:** `POST https://api.castrodeoliveiraadv.org/integrations/n8n/event`
- **O que faz:**
  - Registra o evento na tabela `public.integration_events` e cria um alerta em tempo real no **Sino de Notificações (`/app/notificacoes`)** para a equipe do escritório.
- **Payload JSON (Body):**
```json
{
  "event_type": "whatsapp_lead_qualified",
  "title": "Novo Lead Qualificado no WhatsApp",
  "message": "Cliente Maria da Silva concluiu a triagem pelo WhatsApp.",
  "notify_team": true,
  "payload": {
    "phone": "5594991234567"
  }
}
```

---

### 2.4. Diagnóstico Executivo com IA via n8n
- **Método & URL:** `POST https://api.castrodeoliveiraadv.org/integrations/ai/run`
- **O que faz:**
  - Retorna um resumo consolidado com o total de clientes ativos, processos em andamento, tarefas com SLA vencido e intimações do PJe não lidas (ideal para envio de resumo matinal no grupo de WhatsApp dos sócios).

---

### 2.5. Calculadora de Prazos Processuais (CPC/2015)
- **Método & URL:** `GET https://api.castrodeoliveiraadv.org/prazos/calcular?dataPublicacao=2026-05-22&dias=15&incluirRecesso=true`
- **O que faz:**
  - Calcula a data de início (*dies a quo*) e a data fatal de vencimento (*dies ad quem*) em dias úteis segundo o CPC/2015, descontando feriados nacionais e o recesso forense (20/dez a 20/jan).

---

### 2.6. Webhook Oficial do Asaas (Baixa Automática de Pagamentos)
- **Método & URL:** `POST https://api.castrodeoliveiraadv.org/asaas/webhook`
- **O que faz:**
  - Recebe eventos `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, etc. diretamente do Asaas (ou repassados pelo n8n) e atualiza o status do lançamento em `public.finance_transactions` automaticamente para `paid`.

---

## 3. Supabase Edge Functions Disponíveis

Caso o fluxo do n8n conecte diretamente ao projeto Supabase (`https://tywvrgalkbohyramqtlu.supabase.co/functions/v1/...`):

| Edge Function | URL | Finalidade |
| :--- | :--- | :--- |
| **`clients-upsert-by-channel`** | `/functions/v1/clients-upsert-by-channel` | Cria ou atualiza cliente por `office_id` + `phone_e164` |
| **`messages-send`** | `/functions/v1/messages-send` | Envia mensagem WhatsApp pela Evolution API (`/message/sendText/Castrodeoliveiraadv`) e grava log em `public.integration_outbox` |
| **`n8n-webhook-handler`** | `/functions/v1/n8n-webhook-handler` | Recebe webhooks do n8n com controle de idempotência (`idempotency_key`), grava em `integration_webhook_logs`, `integration_events` e `notifications` |
| **`datajud-last-movement`** | `/functions/v1/datajud-last-movement` | Consulta a última movimentação de um processo pelo número CNJ na base nacional do DataJud |
