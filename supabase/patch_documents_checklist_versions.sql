-- Database migration patch: Document Management, Checklists, and Versioning

BEGIN;

-- 1) Create checklist_items table
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid REFERENCES public.offices(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'under_analysis' | 'approved' | 'rejected'
  rejection_reason text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure office_id is automatically filled on insert
DROP TRIGGER IF EXISTS tr_checklist_items_ensure_office_id ON public.checklist_items;
CREATE TRIGGER tr_checklist_items_ensure_office_id
  BEFORE INSERT ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public._ensure_office_id();

-- Automatically update updated_at timestamp
DROP TRIGGER IF EXISTS tr_checklist_items_set_updated_at ON public.checklist_items;
CREATE TRIGGER tr_checklist_items_set_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Enable RLS and define policies on checklist_items
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checklist_items_select ON public.checklist_items;
CREATE POLICY checklist_items_select ON public.checklist_items
  FOR SELECT USING (public.is_office_member(office_id));

DROP POLICY IF EXISTS checklist_items_insert ON public.checklist_items;
CREATE POLICY checklist_items_insert ON public.checklist_items
  FOR INSERT WITH CHECK (public.is_office_member(office_id));

DROP POLICY IF EXISTS checklist_items_update ON public.checklist_items;
CREATE POLICY checklist_items_update ON public.checklist_items
  FOR UPDATE USING (public.is_office_member(office_id));

DROP POLICY IF EXISTS checklist_items_delete ON public.checklist_items;
CREATE POLICY checklist_items_delete ON public.checklist_items
  FOR DELETE USING (public.is_office_member(office_id));

-- 3) Alter documents table to add metadata, categorization and version columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'under_analysis';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS internal_comments text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS replacement_reason text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS checklist_item_id uuid REFERENCES public.checklist_items(id) ON DELETE SET NULL;

-- 4) Create RPC functions for Client Portal access
CREATE OR REPLACE FUNCTION public.portal_list_client_cases(p_session_token text)
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  description text,
  process_number text,
  area text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_ctx json;
BEGIN
  v_ctx := row_to_json(public.portal_get_client_context(p_session_token));
  v_client_id := (v_ctx->'client'->>'id')::uuid;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.status::text,
    c.description,
    c.process_number,
    c.area,
    c.created_at
  FROM public.cases c
  WHERE c.client_id = v_client_id
  ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_client_cases(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_list_case_checklists(
  p_session_token text,
  p_case_id uuid
)
RETURNS TABLE (
  id uuid,
  case_id uuid,
  title text,
  description text,
  status text,
  rejection_reason text,
  due_date date,
  created_at timestamptz,
  updated_at timestamptz,
  document_id uuid,
  document_title text,
  document_file_path text,
  document_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_ctx json;
BEGIN
  v_ctx := row_to_json(public.portal_get_client_context(p_session_token));
  v_client_id := (v_ctx->'client'->>'id')::uuid;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  -- Verify case ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.cases
    WHERE id = p_case_id AND client_id = v_client_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado para este caso.';
  END IF;

  RETURN QUERY
  SELECT
    ci.id,
    ci.case_id,
    ci.title,
    ci.description,
    ci.status,
    ci.rejection_reason,
    ci.due_date,
    ci.created_at,
    ci.updated_at,
    d.id as document_id,
    d.title as document_title,
    d.file_path as document_file_path,
    d.status as document_status
  FROM public.checklist_items ci
  LEFT JOIN public.documents d ON d.checklist_item_id = ci.id AND d.is_active = true
  WHERE ci.case_id = p_case_id
  ORDER BY ci.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_list_case_checklists(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_link_uploaded_document(
  p_session_token text,
  p_case_id uuid,
  p_checklist_item_id uuid,
  p_title text,
  p_file_path text,
  p_mime_type text,
  p_size_bytes integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_ctx json;
  v_doc_id uuid;
  v_version integer;
  v_office_id uuid;
BEGIN
  -- 1) Resolve client context
  v_ctx := row_to_json(public.portal_get_client_context(p_session_token));
  v_client_id := (v_ctx->'client'->>'id')::uuid;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou expirada.';
  END IF;

  -- 2) Verify case ownership and get office_id
  SELECT office_id INTO v_office_id
  FROM public.cases
  WHERE id = p_case_id AND client_id = v_client_id;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado para este caso.';
  END IF;

  -- 3) Verify checklist item belongs to this case
  IF NOT EXISTS (
    SELECT 1 FROM public.checklist_items
    WHERE id = p_checklist_item_id AND case_id = p_case_id
  ) THEN
    RAISE EXCEPTION 'Item de checklist inválido.';
  END IF;

  -- 4) Determine next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version
  FROM public.documents
  WHERE checklist_item_id = p_checklist_item_id;

  -- 5) Deactivate previous versions of this checklist item
  UPDATE public.documents
  SET is_active = false
  WHERE checklist_item_id = p_checklist_item_id;

  -- 6) Insert document row
  v_doc_id := gen_random_uuid();
  INSERT INTO public.documents (
    id,
    office_id,
    user_id,
    client_id,
    case_id,
    kind,
    title,
    file_path,
    mime_type,
    size_bytes,
    is_public,
    status,
    checklist_item_id,
    version_number,
    is_active
  ) VALUES (
    v_doc_id,
    v_office_id,
    NULL,
    v_client_id,
    p_case_id,
    'case',
    p_title,
    p_file_path,
    p_mime_type,
    p_size_bytes,
    TRUE,
    'under_analysis',
    p_checklist_item_id,
    v_version,
    TRUE
  );

  -- 7) Update checklist item status
  UPDATE public.checklist_items
  SET status = 'under_analysis',
      rejection_reason = NULL
  WHERE id = p_checklist_item_id;

  RETURN v_doc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_link_uploaded_document(text, uuid, uuid, text, text, text, integer) TO anon, authenticated;

COMMIT;
