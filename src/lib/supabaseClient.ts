import { createClient } from '@supabase/supabase-js';

import { env } from '@/env';

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  // Avoid crashing build; runtime pages will show a clear error.
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(env.supabaseUrl || '', env.supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
