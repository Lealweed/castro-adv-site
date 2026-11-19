-- Function to update client avatar via session token
CREATE OR REPLACE FUNCTION public.portal_update_client_avatar(p_session_token text, p_avatar_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.clients
  SET avatar_path = p_avatar_path,
      avatar_updated_at = now()
  WHERE id = p_session_token::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.portal_update_client_avatar(text, text) TO anon, authenticated;

-- Ensure client_avatars bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'client_avatars';

-- Enable RLS and setup permissive policies for client_avatars
DROP POLICY IF EXISTS "Allow public read access to client_avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload access to client_avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update access to client_avatars" ON storage.objects;

CREATE POLICY "Allow public read access to client_avatars" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'client_avatars');

CREATE POLICY "Allow anon upload access to client_avatars" ON storage.objects
  FOR INSERT TO anon WITH CHECK (bucket_id = 'client_avatars');

CREATE POLICY "Allow anon update access to client_avatars" ON storage.objects
  FOR UPDATE TO anon USING (bucket_id = 'client_avatars') WITH CHECK (bucket_id = 'client_avatars');
