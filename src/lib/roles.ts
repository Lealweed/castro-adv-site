import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

export async function getMyOfficeRole() {
  const sb = requireSupabase();
  const user = await getAuthedUser();

  const { data, error } = await sb
    .from('office_members')
    .select('role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return ((data as any)?.role || '') as string;
}

export async function requireRole(allowed: string[]) {
  const role = await getMyOfficeRole().catch(() => '');
  if (!role) return false;
  return allowed.includes(role);
}
