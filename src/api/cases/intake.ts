// Legacy placeholder kept only to document the migration path.
// This Vite app no longer compiles backend handlers from `src/api`.
// Case intake must run via Supabase mutations or a dedicated Edge Function.
export const migratedTo = 'supabase/functions or direct Supabase mutations';

export default async function handler() {
  throw new Error('Legacy intake handler disabled in the Vite frontend build.');
}
