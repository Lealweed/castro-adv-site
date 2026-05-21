-- CRM Jurídico: triggers para popular integration_outbox com notificações de e-mail
-- Aplicar via Supabase SQL Editor

BEGIN;

-- ============================================================
-- EVENTO 1: Cliente envia documento (checklist → under_analysis)
-- Envia e-mail para todos os membros do escritório com perfil
-- de advogada ou admin que tenham e-mail cadastrado
-- ============================================================
CREATE OR REPLACE FUNCTION public._outbox_email_doc_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_case_title  text;
  v_client_id   uuid;
  v_office_id   uuid;
  rec           record;
BEGIN
  -- Só dispara quando muda para 'under_analysis'
  IF NEW.status <> 'under_analysis' OR (OLD.status IS NOT NULL AND OLD.status = 'under_analysis') THEN
    RETURN NEW;
  END IF;

  v_office_id := NEW.office_id;

  SELECT c.client_id, c.title INTO v_client_id, v_case_title
  FROM public.cases c WHERE c.id = NEW.case_id;

  SELECT name INTO v_client_name
  FROM public.clients WHERE id = v_client_id;

  -- Envia para cada membro admin/advogada com e-mail
  FOR rec IN
    SELECT up.email
    FROM public.office_members om
    JOIN public.user_profiles up ON up.user_id = om.user_id
    WHERE om.office_id = v_office_id
      AND om.role IN ('admin', 'advogada')
      AND up.email IS NOT NULL
  LOOP
    INSERT INTO public.integration_outbox (
      office_id, channel, event_type, destination, payload, idempotency_key
    ) VALUES (
      v_office_id,
      'email',
      'doc_received',
      rec.email,
      jsonb_build_object(
        'subject', '📎 Novo documento recebido: ' || COALESCE(v_client_name, 'Cliente'),
        'html', '<p>O cliente <strong>' || COALESCE(v_client_name, 'Desconhecido') ||
                '</strong> enviou um arquivo para a pendência <strong>"' || NEW.title || '"</strong>' ||
                CASE WHEN v_case_title IS NOT NULL THEN ' no caso "' || v_case_title || '"' ELSE '' END ||
                '.</p><p><a href="https://www.castrodeoliveiraadv.org/app/drive">Revisar no sistema →</a></p>'
      ),
      'doc_received:' || NEW.id::text || ':' || rec.email
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_outbox_email_doc_received ON public.checklist_items;
CREATE TRIGGER tr_outbox_email_doc_received
  AFTER UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public._outbox_email_doc_received();


-- ============================================================
-- EVENTO 2: Documento rejeitado — notifica o cliente por e-mail
-- (cliente precisa ter e-mail cadastrado na tabela clients)
-- ============================================================
CREATE OR REPLACE FUNCTION public._outbox_email_doc_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_email text;
  v_client_name  text;
  v_client_id    uuid;
  v_office_id    uuid;
BEGIN
  IF NEW.status <> 'rejected' OR (OLD.status IS NOT NULL AND OLD.status = 'rejected') THEN
    RETURN NEW;
  END IF;

  v_office_id := NEW.office_id;

  SELECT c.client_id INTO v_client_id
  FROM public.cases c WHERE c.id = NEW.case_id;

  SELECT name, email INTO v_client_name, v_client_email
  FROM public.clients WHERE id = v_client_id;

  IF v_client_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.integration_outbox (
    office_id, channel, event_type, destination, payload, idempotency_key
  ) VALUES (
    v_office_id,
    'email',
    'doc_rejected',
    v_client_email,
    jsonb_build_object(
      'subject', '⚠️ Documento precisa de correção — Castro & Oliveira Advocacia',
      'html', '<p>Olá, <strong>' || COALESCE(v_client_name, 'Cliente') || '</strong>.</p>' ||
              '<p>O documento que você enviou para a pendência <strong>"' || NEW.title || '"</strong> ' ||
              'foi recusado e precisa de correção.</p>' ||
              CASE
                WHEN NEW.rejection_reason IS NOT NULL
                THEN '<p><strong>Motivo:</strong> ' || NEW.rejection_reason || '</p>'
                ELSE ''
              END ||
              '<p>Acesse o portal para reenviar: ' ||
              '<a href="https://www.castrodeoliveiraadv.org/portal">Portal do Cliente →</a></p>'
    ),
    'doc_rejected:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_outbox_email_doc_rejected ON public.checklist_items;
CREATE TRIGGER tr_outbox_email_doc_rejected
  AFTER UPDATE ON public.checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public._outbox_email_doc_rejected();


-- ============================================================
-- EVENTO 3: Prazo próximo de vencer (agenda_items)
-- Lembrete D-1 e D-3 para o responsável
-- Chamado via pg_cron ou manualmente
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_deadline_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT
      ai.id,
      ai.office_id,
      ai.title,
      ai.due_date,
      up.email AS responsible_email,
      up.display_name AS responsible_name,
      c.name AS client_name
    FROM public.agenda_items ai
    LEFT JOIN public.user_profiles up ON up.user_id = ai.responsible_user_id
    LEFT JOIN public.clients c ON c.id = ai.client_id
    WHERE ai.due_date IS NOT NULL
      AND ai.due_date::date IN (
        CURRENT_DATE + INTERVAL '1 day',
        CURRENT_DATE + INTERVAL '3 days'
      )
      AND ai.status NOT IN ('done', 'cancelled')
      AND up.email IS NOT NULL
  LOOP
    INSERT INTO public.integration_outbox (
      office_id, channel, event_type, destination, payload, idempotency_key
    ) VALUES (
      rec.office_id,
      'email',
      'deadline_reminder',
      rec.responsible_email,
      jsonb_build_object(
        'subject', '⏰ Prazo se aproximando: ' || rec.title,
        'html', '<p>Olá' || COALESCE(', ' || rec.responsible_name, '') || '.</p>' ||
                '<p>O compromisso <strong>"' || rec.title || '"</strong>' ||
                CASE WHEN rec.client_name IS NOT NULL THEN ' (cliente: ' || rec.client_name || ')' ELSE '' END ||
                ' vence em <strong>' || TO_CHAR(rec.due_date, 'DD/MM/YYYY') || '</strong>.</p>' ||
                '<p><a href="https://www.castrodeoliveiraadv.org/app/agenda">Ver na Agenda →</a></p>'
      ),
      'deadline:' || rec.id::text || ':' || rec.due_date::text
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_deadline_reminders() TO service_role;


-- ============================================================
-- pg_cron: executar lembrete de prazo todo dia às 08:00 BRT (11:00 UTC)
-- Requer extensão pg_cron habilitada no Supabase (Plano Pro+)
-- Descomentar quando disponível:
-- ============================================================
-- SELECT cron.schedule('deadline-reminders-daily', '0 11 * * *', 'SELECT public.enqueue_deadline_reminders()');

COMMIT;
