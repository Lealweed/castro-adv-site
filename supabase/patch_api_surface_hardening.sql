-- Controlled hardening of the exposed PostgREST surface.
BEGIN;

-- These tables are owned by the Prisma/backend or integrations and are not
-- consumed by the anonymous frontend. Keep direct DB/service-role access.
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."Case",
  public."Contact",
  public."Membership",
  public."Organization",
  public."RefreshToken",
  public._prisma_migrations,
  public.integration_events,
  public.integration_webhook_logs,
  public.n8n_chat_histories
FROM anon;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Remove that broad surface,
-- then explicitly allow only the browser RPCs that form the public portal API.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.portal_login_client(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_get_client_context(text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_list_client_messages(text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_send_client_message(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_list_client_documents(text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_list_client_transactions(text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_list_client_cases(text) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_list_case_checklists(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_link_uploaded_document(text, uuid, uuid, text, text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.portal_update_client_avatar(text, text) TO anon;

-- Trigger functions are invoked by existing triggers and do not need to be
-- directly callable through /rest/v1/rpc by authenticated users.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn.signature);
  END LOOP;
END $$;

-- Obsolete portal login must not be callable by app users.
REVOKE EXECUTE ON FUNCTION public.login_client_portal(text, text) FROM authenticated;

-- Fix mutable search_path warnings without changing function bodies.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public._clients_normalize_docs() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_cpf(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_valid_cnpj(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.login_client_portal(text, text) SET search_path = public, pg_temp;

COMMIT;
