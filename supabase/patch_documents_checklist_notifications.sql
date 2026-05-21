-- Database migration patch: Document Download Auditing & Auto Notifications
-- Inicia a transação
BEGIN;

-- 1) Função de trigger para criar notificações quando um checklist item passar para 'under_analysis'
CREATE OR REPLACE FUNCTION public._on_checklist_item_under_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_case_title text;
  v_client_id uuid;
BEGIN
  -- Só dispara se o status mudou para 'under_analysis'
  IF NEW.status = 'under_analysis' AND (OLD.status IS NULL OR OLD.status != 'under_analysis') THEN
    -- Busca o client_id e o título do processo correspondente
    SELECT c.client_id, c.title INTO v_client_id, v_case_title
    FROM public.cases c
    WHERE c.id = NEW.case_id;

    -- Busca o nome do cliente
    SELECT name INTO v_client_name
    FROM public.clients
    WHERE id = v_client_id;

    -- Insere a notificação do sistema direcionada a toda a equipe do escritório (user_id nulo)
    INSERT INTO public.notifications (
      office_id,
      user_id,
      title,
      message,
      type,
      is_read
    ) VALUES (
      NEW.office_id,
      NULL,
      'Novo Documento Enviado',
      'O cliente ' || COALESCE(v_client_name, 'Desconhecido') || ' enviou arquivos para a pendência "' || NEW.title || '" no caso "' || COALESCE(v_case_title, 'Sem Título') || '".',
      'portal',
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Aplica o trigger na tabela checklist_items
DROP TRIGGER IF EXISTS tr_checklist_items_under_analysis ON public.checklist_items;
CREATE TRIGGER tr_checklist_items_under_analysis
  AFTER UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public._on_checklist_item_under_analysis();


-- 2) RPC function to log document download manually with correct office and client context
CREATE OR REPLACE FUNCTION public.log_document_download(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc record;
  v_user_id uuid;
BEGIN
  -- Resgata o usuário autenticado atual
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  -- Seleciona os dados do documento correspondente
  SELECT * INTO v_doc FROM public.documents WHERE id = p_document_id;
  
  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado.';
  END IF;

  -- Verifica se o usuário pertence ao escritório proprietário do documento
  IF NOT public.is_office_member(v_doc.office_id) THEN
    RAISE EXCEPTION 'Acesso negado para este documento.';
  END IF;

  -- Insere o log de auditoria no cofre
  INSERT INTO public.audit_logs (
    office_id,
    user_id,
    action,
    table_name,
    record_id,
    client_id,
    case_id,
    task_id,
    before_data,
    after_data
  ) VALUES (
    v_doc.office_id,
    v_user_id,
    'download',
    'documents',
    v_doc.id,
    v_doc.client_id,
    v_doc.case_id,
    v_doc.task_id,
    NULL,
    jsonb_build_object(
      'title', v_doc.title,
      'file_path', v_doc.file_path,
      'version_number', v_doc.version_number,
      'reason', 'Download/Visualização de arquivo da equipe'
    )
  );
END;
$$;

-- Garante as permissões de execução
GRANT EXECUTE ON FUNCTION public.log_document_download(uuid) TO authenticated;

COMMIT;
