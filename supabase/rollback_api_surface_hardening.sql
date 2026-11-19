-- Emergency permission rollback for patch_api_surface_hardening.sql.
BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."Case",
  public."Contact",
  public."Membership",
  public."Organization",
  public."RefreshToken",
  public._prisma_migrations,
  public.integration_events,
  public.integration_webhook_logs,
  public.n8n_chat_histories
TO anon;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC, anon;

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
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn.signature);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.login_client_portal(text, text) TO authenticated;

COMMIT;
