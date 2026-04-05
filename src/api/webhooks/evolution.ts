// Legacy placeholder kept only to document the migration path.
// Evolution webhooks must run in a secure backend or Supabase Edge Function, not in `src/api`.
export const migratedTo = 'secure backend / Supabase Edge Function';

export default async function handler() {
  throw new Error('Legacy Evolution webhook handler disabled in the Vite frontend build.');
}
