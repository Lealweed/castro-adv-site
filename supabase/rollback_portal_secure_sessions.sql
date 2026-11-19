-- Emergency rollback for patch_portal_secure_sessions.sql
-- Restores the previous portal contract (client UUID used as session token).
BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_messages TO anon;
DROP POLICY IF EXISTS "Livre para o portal" ON public.client_messages;
CREATE POLICY "Livre para o portal" ON public.client_messages
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.portal_login_client(p_cpf text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
BEGIN
  SELECT id, name, phone, whatsapp, email, avatar_path INTO v_client
  FROM public.clients
  WHERE regexp_replace(cpf, '\D', '', 'g') = p_cpf
    AND portal_pin = p_pin
  LIMIT 1;

  IF v_client.id IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'session_token', v_client.id::text,
    'client', jsonb_build_object(
      'id', v_client.id, 'name', v_client.name, 'phone', v_client.phone,
      'whatsapp', v_client.whatsapp, 'email', v_client.email, 'avatar_path', v_client.avatar_path
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_get_client_context(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client record;
  v_next_meeting jsonb;
BEGIN
  SELECT id, name, phone, whatsapp, email, avatar_path, notes INTO v_client
  FROM public.clients WHERE id = p_session_token::uuid;

  IF v_client.id IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object('id', id, 'title', title, 'start_at', starts_at)
    INTO v_next_meeting
  FROM public.agenda_items
  WHERE client_id = v_client.id AND starts_at > now()
  ORDER BY starts_at ASC LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client.id, 'name', v_client.name, 'phone', v_client.phone,
      'whatsapp', v_client.whatsapp, 'email', v_client.email,
      'avatar_path', v_client.avatar_path, 'notes', v_client.notes
    ),
    'next_meeting', v_next_meeting
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_messages(p_session_token text)
RETURNS SETOF public.client_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.client_messages
  WHERE client_id = p_session_token::uuid ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_send_client_message(p_session_token text, p_content text)
RETURNS SETOF public.client_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY INSERT INTO public.client_messages (client_id, sender, content)
  VALUES (p_session_token::uuid, 'client', p_content) RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_documents(p_session_token text)
RETURNS SETOF public.documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.documents
  WHERE client_id = p_session_token::uuid ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_transactions(p_session_token text)
RETURNS SETOF public.finance_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.finance_transactions
  WHERE client_id = p_session_token::uuid AND type = 'receita' ORDER BY due_date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_client_avatar(p_session_token text, p_avatar_path text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.clients
  SET avatar_path = p_avatar_path, avatar_updated_at = now()
  WHERE id = p_session_token::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_login_client(text, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_client_context(text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_messages(text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_send_client_message(text, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_documents(text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_transactions(text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_client_avatar(text, text) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_client_portal(text, text) TO PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.portal_resolve_client_id(text);
DROP TABLE IF EXISTS public.client_portal_sessions;

COMMIT;
