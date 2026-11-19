-- Controlled production hardening: client portal sessions
-- No existing business rows are deleted or rewritten.
BEGIN;

CREATE TABLE IF NOT EXISTS public.client_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours'),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS client_portal_sessions_client_idx
  ON public.client_portal_sessions (client_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS client_portal_sessions_active_idx
  ON public.client_portal_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.client_portal_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_portal_sessions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_resolve_client_id(p_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT s.client_id
    INTO v_client_id
  FROM public.client_portal_sessions s
  WHERE s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.client_portal_sessions
      SET last_seen_at = now()
    WHERE token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex');
  END IF;

  RETURN v_client_id;
END;
$$;
REVOKE ALL ON FUNCTION public.portal_resolve_client_id(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_login_client(p_cpf text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client record;
  v_token text;
BEGIN
  SELECT id, name, phone, whatsapp, email, avatar_path
    INTO v_client
  FROM public.clients
  WHERE regexp_replace(cpf, '\D', '', 'g') = regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g')
    AND (
      portal_pin = p_pin
      OR (
        portal_pin LIKE '%$%'
        AND split_part(portal_pin, '$', 2) = encode(
          extensions.digest(split_part(portal_pin, '$', 1) || coalesce(p_pin, ''), 'sha256'),
          'hex'
        )
      )
    )
  LIMIT 1;

  IF v_client.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.client_portal_sessions (token_hash, client_id)
  VALUES (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_client.id);

  RETURN jsonb_build_object(
    'session_token', v_token,
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'phone', v_client.phone,
      'whatsapp', v_client.whatsapp,
      'email', v_client.email,
      'avatar_path', v_client.avatar_path
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_get_client_context(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_client record;
  v_next_meeting jsonb;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  IF v_client_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, name, phone, whatsapp, email, avatar_path, notes
    INTO v_client
  FROM public.clients
  WHERE id = v_client_id;

  IF v_client.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object('id', id, 'title', title, 'starts_at', starts_at, 'start_at', starts_at)
    INTO v_next_meeting
  FROM public.agenda_items
  WHERE client_id = v_client.id
    AND starts_at > now()
  ORDER BY starts_at ASC
  LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object(
      'id', v_client.id,
      'name', v_client.name,
      'phone', v_client.phone,
      'whatsapp', v_client.whatsapp,
      'email', v_client.email,
      'avatar_path', v_client.avatar_path,
      'notes', v_client.notes
    ),
    'next_meeting', v_next_meeting
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_messages(p_session_token text)
RETURNS SETOF public.client_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  RETURN QUERY
  SELECT * FROM public.client_messages
  WHERE client_id = v_client_id
  ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_send_client_message(p_session_token text, p_content text)
RETURNS SETOF public.client_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_content text;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  v_content := btrim(coalesce(p_content, ''));

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;
  IF v_content = '' OR length(v_content) > 5000 THEN
    RAISE EXCEPTION 'Mensagem inválida.';
  END IF;

  RETURN QUERY
  INSERT INTO public.client_messages (client_id, sender, content)
  VALUES (v_client_id, 'client', v_content)
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_documents(p_session_token text)
RETURNS SETOF public.documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  RETURN QUERY
  SELECT * FROM public.documents
  WHERE client_id = v_client_id
  ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_list_client_transactions(p_session_token text)
RETURNS SETOF public.finance_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  RETURN QUERY
  SELECT * FROM public.finance_transactions
  WHERE client_id = v_client_id
    AND type IN ('income', 'receita')
  ORDER BY due_date ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_update_client_avatar(p_session_token text, p_avatar_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client_id uuid;
  v_expected_path text;
BEGIN
  v_client_id := public.portal_resolve_client_id(p_session_token);
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  v_expected_path := 'portal_avatars/' || v_client_id::text || '_avatar.png';
  IF p_avatar_path IS DISTINCT FROM v_expected_path THEN
    RAISE EXCEPTION 'Caminho de avatar inválido.';
  END IF;

  UPDATE public.clients
    SET avatar_path = p_avatar_path,
        avatar_updated_at = now()
  WHERE id = v_client_id;
END;
$$;

-- The browser uses these RPCs. Remove implicit PUBLIC grants first.
REVOKE ALL ON FUNCTION public.portal_login_client(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_get_client_context(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_list_client_messages(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_send_client_message(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_list_client_documents(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_list_client_transactions(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.portal_update_client_avatar(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.portal_login_client(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_get_client_context(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_messages(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_send_client_message(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_documents(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_list_client_transactions(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_update_client_avatar(text, text) TO anon, authenticated;

-- Disable obsolete RPC that returns a client UUID as the login result.
REVOKE ALL ON FUNCTION public.login_client_portal(text, text) FROM PUBLIC, anon, authenticated;

-- Portal traffic goes through validated RPCs, never direct table access.
DROP POLICY IF EXISTS "Livre para o portal" ON public.client_messages;
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_messages FROM anon;

COMMIT;
