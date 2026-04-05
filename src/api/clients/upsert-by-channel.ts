// Legacy placeholder kept only to document the migration path.
// Channel-based client upsert must execute in a secure backend service, not inside `src/api`.
export const migratedTo = 'supabase/functions or secure backend';

export default async function handler() {
  throw new Error('Legacy client upsert handler disabled in the Vite frontend build.');
}
