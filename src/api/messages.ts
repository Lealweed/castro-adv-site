// Legacy placeholder kept only to document the migration path.
// WhatsApp sending now belongs to the Supabase Edge Function `messages-send`.
export const migratedTo = 'supabase/functions/messages-send';

export default async function handler() {
  throw new Error('Legacy messages handler disabled in the Vite frontend build.');
}
