import { getAuthedUser, requireSupabase } from '@/lib/supabaseDb';

let _cachedRole: string | null = null;
let _cachedAt = 0;

export async function getMyOfficeRole() {
  const now = Date.now();
  if (_cachedRole && now - _cachedAt < 10_000) return _cachedRole;

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
  const role = (data as any)?.role || '';
  _cachedRole = role;
  _cachedAt = now;
  return role;
}

export async function requireRole(allowed: string[]) {
  const role = await getMyOfficeRole().catch(() => '');
  if (!role) return false;
  return allowed.includes(role);
}
