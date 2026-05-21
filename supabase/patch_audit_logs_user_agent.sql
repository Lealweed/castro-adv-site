-- CRM Jurídico: adiciona user_agent na tabela de auditoria (LGPD - rastreabilidade de dispositivo)
-- Aplicar via psql ou Supabase SQL Editor

begin;

-- 1) Adiciona coluna user_agent na tabela audit_logs
alter table public.audit_logs
  add column if not exists user_agent text null;

-- 2) Atualiza a função RPC de log de download para capturar user_agent
create or replace function public.log_document_download(
  p_document_id uuid,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_office_id uuid;
  v_doc record;
begin
  v_user_id := auth.uid();

  -- Busca dados do documento para preencher os campos de contexto
  select office_id, client_id, case_id, task_id, title
  into v_doc
  from public.documents
  where id = p_document_id;

  if not found then
    return;
  end if;

  insert into public.audit_logs (
    office_id,
    user_id,
    action,
    table_name,
    record_id,
    client_id,
    case_id,
    task_id,
    user_agent,
    after_data
  ) values (
    v_doc.office_id,
    v_user_id,
    'download',
    'documents',
    p_document_id,
    v_doc.client_id,
    v_doc.case_id,
    v_doc.task_id,
    p_user_agent,
    jsonb_build_object(
      'document_id', p_document_id,
      'title', v_doc.title,
      'action', 'download'
    )
  );
end;
$$;

-- 3) Garante que a política de select inclui a nova coluna (sem alterações necessárias, select policy já existe)

commit;
