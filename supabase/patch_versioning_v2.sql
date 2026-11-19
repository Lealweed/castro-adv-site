-- Add root_id column
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS root_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS documents_root_id_idx ON public.documents(root_id);

-- Backfill: for existing versioned docs, set root_id to parent_id where parent has no parent (i.e., is root)
UPDATE public.documents SET root_id = parent_id WHERE parent_id IS NOT NULL AND root_id IS NULL;
UPDATE public.documents SET root_id = id WHERE parent_id IS NULL AND version_number > 1 AND root_id IS NULL;

-- RPC: get next version number and deactivate previous versions
CREATE OR REPLACE FUNCTION public.prepare_new_document_version(p_root_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_next int;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
  FROM public.documents WHERE root_id = p_root_id OR id = p_root_id;
  
  UPDATE public.documents SET is_active = false WHERE root_id = p_root_id OR id = p_root_id;
  
  RETURN v_next;
END; $$;

GRANT EXECUTE ON FUNCTION public.prepare_new_document_version(uuid) TO authenticated;
